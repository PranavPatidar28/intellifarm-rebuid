import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  MarketProvider,
  MarketQueryInput,
  NormalizedMarketRecord,
} from './market-provider';

// ── Types matching the scraper API response ─────────────────────────────────

type ScraperMandiPriceResult = {
  commodity: string;
  market_location: string;
  state: string;
  district: string;
  market: string;
  grade: string;
  source_date: string;
  min_price: number | null;
  max_price: number | null;
  modal_price: number | null;
  scraped_at: string;
};

type ScraperMandiPricesResponse = {
  success: boolean;
  count: number;
  cache_refreshed: boolean;
  results: ScraperMandiPriceResult[];
};

// ── Cache entry ─────────────────────────────────────────────────────────────

type CacheEntry = {
  records: NormalizedMarketRecord[];
  fetchedAt: number;
};

// ── Scraper Market Provider ─────────────────────────────────────────────────

/**
 * Market provider that fetches live mandi prices from the IntelliFarm
 * Finnid scraper API (hackathon endpoint).
 *
 * Base URL: http://10.152.88.139:8000
 * Endpoint: GET /api/mandi-prices/latest
 */
@Injectable()
export class ScraperMarketProvider implements MarketProvider {
  private readonly logger = new Logger(ScraperMarketProvider.name);
  private readonly baseUrl: string;

  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'SCRAPER_API_BASE_URL',
      'http://10.152.88.139:8000',
    );
  }

  // ── Public interface ──────────────────────────────────────────────────

  async listMarketRecords(
    query: MarketQueryInput,
  ): Promise<NormalizedMarketRecord[]> {
    const cacheKey = this.buildCacheKey(query);
    const cached = this.cache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.fetchedAt < ScraperMarketProvider.CACHE_TTL_MS
    ) {
      this.logger.debug(
        `Cache HIT for key "${cacheKey}" (age ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s)`,
      );
      return cached.records;
    }

    try {
      const records = await this.fetchFromScraper(query);
      this.cache.set(cacheKey, { records, fetchedAt: Date.now() });

      this.logger.log(
        `Fetched ${records.length} records from scraper API (key="${cacheKey}")`,
      );
      return records;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Scraper API fetch failed: ${errorMessage}`);

      // Serve stale cache if available
      if (cached) {
        this.logger.log(
          `Serving stale cache for key "${cacheKey}" (age ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s)`,
        );
        return cached.records;
      }

      // Let the caller (MarketsService) fall back to the database
      throw new Error(
        `Scraper API failed and no cache available: ${errorMessage}`,
      );
    }
  }

  // ── Scraper API call ──────────────────────────────────────────────────

  private async fetchFromScraper(
    query: MarketQueryInput,
  ): Promise<NormalizedMarketRecord[]> {
    const params = new URLSearchParams();

    if (query.cropName) {
      params.set('commodity', query.cropName);
    }

    if (query.state) {
      params.set('state', query.state);
    }

    if (query.district) {
      params.set('district', query.district);
    }

    // The scraper API supports limit 1-500, default 50
    const limit = Math.min(query.limit ?? 100, 500);
    params.set('limit', String(limit));

    const url = `${this.baseUrl}/api/mandi-prices/latest?${params.toString()}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`Scraper API responded with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as ScraperMandiPricesResponse;

    if (!payload.success) {
      throw new Error('Scraper API returned success=false');
    }

    return payload.results
      .map((result, index) => this.normalizeScraperRecord(result, index))
      .filter(
        (record): record is NormalizedMarketRecord =>
          record != null && Number.isFinite(record.priceModal),
      );
  }

  // ── Normalize scraper response to NormalizedMarketRecord ──────────────

  private normalizeScraperRecord(
    raw: ScraperMandiPriceResult,
    index: number,
  ): NormalizedMarketRecord | null {
    const cropName = raw.commodity?.trim() || null;
    const mandiName = raw.market?.trim() || raw.market_location?.trim() || null;
    const district = raw.district?.trim() || '';
    const state = raw.state?.trim() || '';
    const priceModal = raw.modal_price;

    if (
      !cropName ||
      !mandiName ||
      priceModal == null ||
      !Number.isFinite(priceModal)
    ) {
      return null;
    }

    // source_date comes as "YYYY-MM-DD"
    const recordDate = raw.source_date
      ? new Date(raw.source_date).toISOString()
      : new Date().toISOString();

    return {
      id: `scraper-${index}-${cropName}-${mandiName}-${district}`
        .replace(/\s+/g, '-')
        .toLowerCase(),
      facilityId: null,
      cropName,
      mandiName,
      district,
      state,
      priceMin:
        raw.min_price != null && Number.isFinite(raw.min_price)
          ? raw.min_price
          : priceModal,
      priceMax:
        raw.max_price != null && Number.isFinite(raw.max_price)
          ? raw.max_price
          : priceModal,
      priceModal,
      recordDate,
      source: 'finnid-scraper',
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private buildCacheKey(query: MarketQueryInput): string {
    const parts: string[] = [];

    if (query.cropName) parts.push(`c:${query.cropName.toLowerCase()}`);
    if (query.state) parts.push(`s:${query.state.toLowerCase()}`);
    if (query.district) parts.push(`d:${query.district.toLowerCase()}`);
    if (query.limit) parts.push(`l:${query.limit}`);

    return parts.length ? parts.join('|') : '__global__';
  }
}
