import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

// ── Shared types ────────────────────────────────────────────────────────────

export type NormalizedMarketRecord = {
  id: string;
  facilityId: string | null;
  cropName: string;
  mandiName: string;
  district: string;
  state: string;
  priceMin: number;
  priceMax: number;
  priceModal: number;
  recordDate: string;
  source: string;
};

export type MarketQueryInput = {
  cropName?: string;
  state?: string;
  district?: string;
  limit?: number;
};

export interface MarketProvider {
  listMarketRecords(query: MarketQueryInput): Promise<NormalizedMarketRecord[]>;
}

export const MARKET_PROVIDER = Symbol('MARKET_PROVIDER');

// ── Seeded (database) provider ──────────────────────────────────────────────

@Injectable()
export class SeededMarketProvider implements MarketProvider {
  constructor(private readonly prisma: PrismaService) {}

  async listMarketRecords(query: MarketQueryInput) {
    const records = await this.prisma.marketRecord.findMany({
      where: {
        ...(query.cropName
          ? {
              cropName: {
                contains: query.cropName,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(query.state
          ? {
              state: {
                equals: query.state,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(query.district
          ? {
              district: {
                contains: query.district,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: [{ recordDate: 'desc' }, { priceModal: 'desc' }],
      take: query.limit ?? 50,
    });

    return records.map((record) => ({
      id: record.id,
      facilityId: record.facilityId,
      cropName: record.cropName,
      mandiName: record.mandiName,
      district: record.district,
      state: record.state,
      priceMin: record.priceMin,
      priceMax: record.priceMax,
      priceModal: record.priceModal,
      recordDate: record.recordDate.toISOString(),
      source: record.source,
    }));
  }
}

// ── Cache entry type ────────────────────────────────────────────────────────

type CacheEntry = {
  records: NormalizedMarketRecord[];
  fetchedAt: number;
};

// ── Live data.gov.in provider (Variety-wise Daily Market Prices API) ─────

@Injectable()
export class DataGovMarketProvider implements MarketProvider {
  private readonly logger = new Logger(DataGovMarketProvider.name);

  /** In-memory cache keyed by a hash of the query parameters. */
  private readonly cache = new Map<string, CacheEntry>();

  /** Cache TTL — 15 minutes. Market data updates once daily so this is conservative. */
  private static readonly CACHE_TTL_MS = 15 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Public interface ────────────────────────────────────────────────────

  async listMarketRecords(
    query: MarketQueryInput,
  ): Promise<NormalizedMarketRecord[]> {
    const cacheKey = buildCacheKey(query);
    const cached = this.cache.get(cacheKey);

    // Serve from in-memory cache if still fresh
    if (
      cached &&
      Date.now() - cached.fetchedAt < DataGovMarketProvider.CACHE_TTL_MS
    ) {
      this.logger.debug(
        `Cache HIT for key "${cacheKey}" (age ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s)`,
      );
      return cached.records;
    }

    try {
      const records = await this.fetchFromApi(query);

      // Update in-memory cache
      this.cache.set(cacheKey, { records, fetchedAt: Date.now() });

      // Persist to DB in the background (fire-and-forget) so we have fallback data
      this.persistRecords(records).catch((error) => {
        this.logger.warn(`Background DB persist failed: ${error.message}`);
      });

      return records;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Live API fetch failed: ${errorMessage}`);

      // Serve stale cache if available
      if (cached) {
        this.logger.log(
          `Serving stale cache for key "${cacheKey}" (age ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s)`,
        );
        return cached.records;
      }

      // Let the caller (MarketsService) fall back to the database
      throw new Error(
        `Live market API failed and no cache available: ${errorMessage}`,
      );
    }
  }

  // ── Scheduled warm-up ─────────────────────────────────────────────────

  /**
   * Every 2 hours, prefetch a bulk set of records without filters to keep
   * the in-memory cache and DB populated for quick responses.
   */
  @Cron('0 */2 * * *')
  async warmUpCache() {
    this.logger.log('Starting scheduled cache warm-up…');
    try {
      const records = await this.fetchFromApi({ limit: 500 });
      const globalKey = buildCacheKey({ limit: 500 });
      this.cache.set(globalKey, { records, fetchedAt: Date.now() });

      await this.persistRecords(records);
      this.logger.log(
        `Cache warm-up complete — ${records.length} records cached and persisted.`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache warm-up failed: ${msg}`);
    }
  }

  /**
   * On application startup, trigger an initial cache warm-up so the first
   * user request doesn't have to wait for the API.
   */
  onModuleInit() {
    // Delay slightly to avoid blocking startup
    setTimeout(() => {
      this.warmUpCache().catch(() => {});
    }, 5_000);
  }

  // ── API call ──────────────────────────────────────────────────────────

  private async fetchFromApi(
    query: MarketQueryInput,
  ): Promise<NormalizedMarketRecord[]> {
    const resourceId = this.configService.get<string>('DATA_GOV_RESOURCE_ID');
    const apiKey = this.configService.get<string>('DATA_GOV_API_KEY');
    const baseUrl = this.configService.get<string>(
      'DATA_GOV_MARKET_BASE_URL',
      'https://api.data.gov.in/resource',
    );

    if (!resourceId || !apiKey) {
      throw new Error(
        'Data.gov market provider is not configured (missing DATA_GOV_RESOURCE_ID or DATA_GOV_API_KEY)',
      );
    }

    // When filtering by a specific commodity, widen the date range to 7 days
    // because the API has very few records per day (~11 total across all
    // states/commodities). The triple filter commodity+state+date is almost
    // always empty. State/district filtering is done in-memory by
    // loadEnrichedRecords, so we skip it here to get broader results.
    const hasCropFilter = Boolean(query.cropName);
    const recentDates = getRecentDatesForFilter(hasCropFilter ? 7 : 3);
    const allRecords: NormalizedMarketRecord[] = [];
    let globalIndex = 0;

    for (const dateStr of recentDates) {
      const params = new URLSearchParams({
        'api-key': apiKey,
        format: 'json',
        limit: String(query.limit ?? 100),
        offset: '0',
      });

      // CRITICAL: Always filter by date to get recent prices
      params.set('filters[Arrival_Date]', dateStr);

      // Apply commodity filter
      if (query.cropName) {
        params.set('filters[Commodity]', query.cropName);
      }

      // Only apply state/district at the API level when NOT filtering by
      // commodity — for crop detail pages the state filter is too restrictive
      // and the service layer filters in-memory anyway.
      if (!hasCropFilter) {
        if (query.state) {
          params.set('filters[State]', query.state);
        }

        if (query.district) {
          params.set('filters[District]', query.district);
        }
      }

      try {
        const url = `${baseUrl}/${resourceId}?${params.toString()}`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          this.logger.warn(
            `Data.gov API responded with HTTP ${response.status} for date ${dateStr}`,
          );
          continue;
        }

        const payload = (await response.json()) as {
          status?: string;
          message?: string;
          total?: number;
          count?: number;
          records?: Array<Record<string, unknown>>;
        };

        if (payload.status === 'error') {
          this.logger.warn(
            `Data.gov API error for date ${dateStr}: ${payload.message}`,
          );
          continue;
        }

        const rawRecords = payload.records ?? [];
        const normalized = rawRecords
          .map((record, index) =>
            normalizeApiRecord(record, globalIndex + index),
          )
          .filter(
            (record): record is NormalizedMarketRecord =>
              record != null && Number.isFinite(record.priceModal),
          );

        allRecords.push(...normalized);
        globalIndex += rawRecords.length;

        // If we got enough records from today, skip older dates
        if (allRecords.length >= (query.limit ?? 100)) {
          break;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Fetch failed for date ${dateStr}: ${msg}`);
        continue;
      }
    }

    if (!allRecords.length) {
      throw new Error(
        'No records returned from data.gov.in for any recent date',
      );
    }

    return allRecords;
  }

  // ── DB persistence ────────────────────────────────────────────────────

  /**
   * Persist live records to the MarketRecord table so they serve as fallback
   * data when the external API is unavailable. Uses upsert-like logic:
   * skip records that would create a unique conflict.
   */
  private async persistRecords(
    records: NormalizedMarketRecord[],
  ): Promise<void> {
    if (!records.length) return;

    const batchSize = 50;
    let persisted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      try {
        const result = await this.prisma.marketRecord.createMany({
          data: batch.map((record) => ({
            cropName: record.cropName,
            mandiName: record.mandiName,
            district: record.district,
            state: record.state,
            priceMin: record.priceMin,
            priceMax: record.priceMax,
            priceModal: record.priceModal,
            recordDate: new Date(record.recordDate),
            source: record.source,
          })),
          skipDuplicates: true,
        });

        persisted += result.count;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to persist batch ${i / batchSize + 1}: ${msg}`,
        );
      }
    }

    if (persisted > 0) {
      this.logger.debug(`Persisted ${persisted} new market records to DB`);
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize a raw record from the Variety-wise Daily Market Prices API
 * into our standard NormalizedMarketRecord shape.
 *
 * The API returns capitalized field names and prices as strings:
 * { State, District, Market, Commodity, Variety, Grade, Arrival_Date,
 *   Min_Price, Max_Price, Modal_Price }
 */
function normalizeApiRecord(
  raw: Record<string, unknown>,
  index: number,
): NormalizedMarketRecord | null {
  const cropName =
    readString(raw.Commodity) ?? readString(raw.commodity) ?? null;
  const mandiName = readString(raw.Market) ?? readString(raw.market) ?? null;
  const district = readString(raw.District) ?? readString(raw.district) ?? '';
  const state = readString(raw.State) ?? readString(raw.state) ?? '';

  const priceMin = readNumber(raw.Min_Price ?? raw.min_price);
  const priceMax = readNumber(raw.Max_Price ?? raw.max_price);
  const priceModal = readNumber(raw.Modal_Price ?? raw.modal_price);

  const rawDate =
    readString(raw.Arrival_Date) ?? readString(raw.arrival_date) ?? null;

  if (!cropName || !mandiName || !Number.isFinite(priceModal)) {
    return null;
  }

  const recordDate =
    parseIndianDate(rawDate) ?? new Date().toISOString().slice(0, 10);

  // Use the commodity name only (not variety) for consistent matching
  // throughout the enrichment pipeline. The variety data can cause
  // mismatches when the service looks up history or linked facilities.
  const displayCropName = cropName;

  return {
    id: `live-${index}-${cropName}-${mandiName}-${district}`
      .replace(/\s+/g, '-')
      .toLowerCase(),
    facilityId: null,
    cropName: displayCropName,
    mandiName,
    district,
    state,
    priceMin: Number.isFinite(priceMin) ? priceMin : priceModal,
    priceMax: Number.isFinite(priceMax) ? priceMax : priceModal,
    priceModal,
    recordDate: new Date(recordDate).toISOString(),
    source: 'data.gov.in live',
  };
}

/**
 * Parse a date in DD/MM/YYYY or DD-MM-YYYY format (common in Indian govt APIs)
 * into an ISO date string (YYYY-MM-DD).
 */
function parseIndianDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Handle YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Fallback: try native Date parsing
  const parsed = new Date(dateStr);
  return Number.isFinite(parsed.getTime())
    ? parsed.toISOString().slice(0, 10)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

/**
 * Build a deterministic cache key from the query parameters.
 */
function buildCacheKey(query: MarketQueryInput): string {
  const parts: string[] = [];

  if (query.cropName) parts.push(`c:${query.cropName.toLowerCase()}`);
  if (query.state) parts.push(`s:${query.state.toLowerCase()}`);
  if (query.district) parts.push(`d:${query.district.toLowerCase()}`);
  if (query.limit) parts.push(`l:${query.limit}`);

  return parts.length ? parts.join('|') : '__global__';
}

/**
 * Generate an array of recent dates in DD/MM/YYYY format (the format
 * the data.gov.in API expects for the Arrival_Date filter).
 *
 * Returns today first, then yesterday, etc. for `dayCount` days.
 */
function getRecentDatesForFilter(dayCount: number): string[] {
  const dates: string[] = [];
  const now = new Date();

  for (let i = 0; i < dayCount; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    dates.push(`${dd}/${mm}/${yyyy}`);
  }

  return dates;
}
