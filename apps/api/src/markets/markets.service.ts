import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Facility, MarketRecord as PrismaMarketRecord } from '@prisma/client';

import { diffInDays } from '../common/utils/date.util';
import { haversineDistanceKm } from '../common/utils/geo.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  MARKET_PROVIDER,
  type MarketProvider,
  type NormalizedMarketRecord,
} from './market-provider';

type MarketQuery = {
  cropName?: string;
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  bestPriceOnly?: boolean;
  includeDistance?: boolean;
};

type MarketExplorerQuery = {
  scope: 'district' | 'state';
  latitude?: number;
  longitude?: number;
  page: number;
  pageSize: number;
  search?: string;
};

type ScopeContext = {
  scope: 'district' | 'state';
  state: string;
  district: string;
};

type EnrichedMarketRecord = NormalizedMarketRecord & {
  cropKey: string;
  mandiKey: string;
  facilityId: string | null;
  linkedFacility: Facility | null;
  distanceKm: number | null;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  trendLabel: string;
  deltaFromPrevious: number | null;
  freshnessLabel: string;
};

@Injectable()
export class MarketsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MARKET_PROVIDER)
    private readonly marketProvider: MarketProvider,
  ) {}

  async listMarkets(userId: string, query: MarketQuery) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { state: true, district: true },
    });

    const records = await this.loadEnrichedRecords({
      cropName: query.cropName,
      district: query.district || user?.district || undefined,
      includeDistance: query.includeDistance,
      latitude: query.latitude,
      limit: 80,
      longitude: query.longitude,
      state: query.state || user?.state || undefined,
    });

    const bestRecord = records.length
      ? records
          .slice()
          .sort((left, right) => right.priceModal - left.priceModal)[0]
      : null;
    const topNearby = records.filter((record) => record.distanceKm != null).slice(0, 3);
    const recommendedRecord =
      topNearby[0] && bestRecord
        ? topNearby[0].priceModal + 75 >= bestRecord.priceModal
          ? topNearby[0]
          : bestRecord
        : topNearby[0] ?? bestRecord;

    return {
      bestRecord: serializeRecord(bestRecord),
      cropName: query.cropName ?? null,
      generatedAt: new Date().toISOString(),
      records: query.bestPriceOnly
        ? bestRecord
          ? [serializeRecord(bestRecord)]
          : []
        : records.slice(0, 20).map(serializeRecord),
      recommendedRecord: serializeRecord(recommendedRecord),
      topNearby: topNearby.map(serializeRecord),
    };
  }

  async listExplorerCrops(userId: string, query: MarketExplorerQuery) {
    const scopeContext = await this.resolveScopeContext(userId, query.scope);
    const records = await this.loadEnrichedRecords({
      district: scopeContext.scope === 'district' ? scopeContext.district : undefined,
      includeDistance: true,
      latitude: query.latitude,
      limit: 240,
      longitude: query.longitude,
      state: scopeContext.state,
    });

    const grouped = groupByKey(records, (record) => record.cropKey);
    const summaries = Array.from(grouped.values())
      .map((group) => buildCropSummary(group))
      .filter((summary) =>
        query.search
          ? summary.cropName.toLowerCase().includes(query.search.trim().toLowerCase())
          : true,
      )
      .sort((left, right) => {
        const leftPrice = left.latestRecord?.priceModal ?? 0;
        const rightPrice = right.latestRecord?.priceModal ?? 0;
        return rightPrice - leftPrice || left.cropName.localeCompare(right.cropName);
      });

    const pageInfo = buildPageInfo(summaries.length, query.page, query.pageSize);

    return {
      crops: summaries.slice(pageInfo.startIndex, pageInfo.endIndex),
      generatedAt: new Date().toISOString(),
      pageInfo: pageInfo.meta,
      scope: query.scope,
    };
  }

  async listExplorerMandis(userId: string, query: MarketExplorerQuery) {
    const scopeContext = await this.resolveScopeContext(userId, query.scope);
    const records = await this.loadEnrichedRecords({
      district: scopeContext.scope === 'district' ? scopeContext.district : undefined,
      includeDistance: true,
      latitude: query.latitude,
      limit: 240,
      longitude: query.longitude,
      state: scopeContext.state,
    });

    const grouped = groupByKey(records, (record) => record.mandiKey);
    const summaries = Array.from(grouped.values())
      .map((group) => buildMandiSummary(group))
      .filter((summary) => {
        if (!query.search) {
          return true;
        }

        const queryText = query.search.trim().toLowerCase();
        return [summary.mandiName, summary.district, summary.state]
          .join(' ')
          .toLowerCase()
          .includes(queryText);
      })
      .sort((left, right) => {
        const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
        const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;
        return (
          leftDistance - rightDistance ||
          left.mandiName.localeCompare(right.mandiName) ||
          left.district.localeCompare(right.district)
        );
      });

    const pageInfo = buildPageInfo(summaries.length, query.page, query.pageSize);

    return {
      generatedAt: new Date().toISOString(),
      mandis: summaries.slice(pageInfo.startIndex, pageInfo.endIndex),
      pageInfo: pageInfo.meta,
      scope: query.scope,
    };
  }

  async getCropDetail(
    userId: string,
    cropName: string,
    query: Omit<MarketExplorerQuery, 'search' | 'page' | 'pageSize'>,
  ) {
    const scopeContext = await this.resolveScopeContext(userId, query.scope);
    const records = await this.loadEnrichedRecords({
      cropName,
      district: scopeContext.scope === 'district' ? scopeContext.district : undefined,
      includeDistance: true,
      latitude: query.latitude,
      limit: 240,
      longitude: query.longitude,
      state: scopeContext.state,
    });

    const bestRecord = records.length
      ? records
          .slice()
          .sort((left, right) => right.priceModal - left.priceModal)[0]
      : null;
    const nearestRecord =
      records
        .filter((record) => record.distanceKm != null)
        .sort(
          (left, right) =>
            (left.distanceKm ?? Number.POSITIVE_INFINITY) -
            (right.distanceKm ?? Number.POSITIVE_INFINITY),
        )[0] ?? null;

    return {
      crop: {
        bestRecord: serializeRecord(bestRecord),
        cropKey: createCropKey(cropName),
        cropName,
        mandiCount: new Set(records.map((record) => record.mandiKey)).size,
        nearestRecord: serializeRecord(nearestRecord),
        nearbyRecords: records
          .filter((record) => record.distanceKm != null)
          .slice(0, 5)
          .map(serializeRecord),
        records: records.map(serializeRecord),
        scope: query.scope,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getMandiDetail(
    userId: string,
    mandiKey: string,
    query: Omit<MarketExplorerQuery, 'search' | 'page' | 'pageSize'>,
  ) {
    const scopeContext = await this.resolveScopeContext(userId, query.scope);
    const records = await this.loadEnrichedRecords({
      district: scopeContext.scope === 'district' ? scopeContext.district : undefined,
      includeDistance: true,
      latitude: query.latitude,
      limit: 240,
      longitude: query.longitude,
      state: scopeContext.state,
    });

    const mandiRecords = records.filter((record) => record.mandiKey === mandiKey);
    if (!mandiRecords.length) {
      throw new NotFoundException('Mandi not found');
    }

    const freshestRecord = mandiRecords
      .slice()
      .sort(
        (left, right) =>
          new Date(right.recordDate).getTime() - new Date(left.recordDate).getTime(),
      )[0];
    const topRecord = mandiRecords
      .slice()
      .sort((left, right) => right.priceModal - left.priceModal)[0];
    const linkedFacility = freshestRecord.linkedFacility
      ? buildLinkedFacilitySummary(
          freshestRecord.linkedFacility,
          query.latitude,
          query.longitude,
        )
      : null;

    return {
      generatedAt: new Date().toISOString(),
      mandi: {
        cropCount: new Set(mandiRecords.map((record) => record.cropKey)).size,
        district: freshestRecord.district,
        distanceKm:
          mandiRecords.find((record) => record.distanceKm != null)?.distanceKm ?? null,
        freshestRecord: serializeRecord(freshestRecord),
        linkedFacility,
        mandiKey: freshestRecord.mandiKey,
        mandiName: freshestRecord.mandiName,
        records: mandiRecords
          .slice()
          .sort((left, right) => right.priceModal - left.priceModal)
          .map(serializeRecord),
        scope: query.scope,
        state: freshestRecord.state,
        topRecord: serializeRecord(topRecord),
      },
    };
  }

  private async resolveScopeContext(
    userId: string,
    scope: 'district' | 'state',
  ): Promise<ScopeContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { district: true, state: true },
    });

    if (!user?.state || !user?.district) {
      throw new NotFoundException('User market location is not available');
    }

    return {
      district: user.district,
      scope,
      state: user.state,
    };
  }

  private async loadEnrichedRecords({
    cropName,
    district,
    includeDistance,
    latitude,
    limit,
    longitude,
    state,
  }: {
    cropName?: string;
    state?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    includeDistance?: boolean;
    limit?: number;
  }) {
    let records: NormalizedMarketRecord[];
    try {
      records = await this.marketProvider.listMarketRecords({
        cropName,
        district,
        limit,
        state,
      });
    } catch {
      records = await this.prisma.marketRecord
        .findMany({
          where: {
            ...(cropName
              ? {
                  cropName: {
                    contains: cropName,
                    mode: 'insensitive',
                  },
                }
              : {}),
            ...(state
              ? {
                  state: {
                    equals: state,
                    mode: 'insensitive',
                  },
                }
              : {}),
            ...(district
              ? {
                  district: {
                    contains: district,
                    mode: 'insensitive',
                  },
                }
              : {}),
          },
          orderBy: [{ recordDate: 'desc' }, { priceModal: 'desc' }],
          take: limit ?? 80,
        })
        .then((items) =>
          items.map((item) => ({
            cropName: item.cropName,
            district: item.district,
            facilityId: item.facilityId,
            id: item.id,
            mandiName: item.mandiName,
            priceMax: item.priceMax,
            priceMin: item.priceMin,
            priceModal: item.priceModal,
            recordDate: item.recordDate.toISOString(),
            source: item.source,
            state: item.state,
          })),
        );
    }

    const facilities =
      latitude != null && longitude != null
        ? await this.prisma.facility.findMany({
            where: {
              active: true,
              type: 'MANDI',
            },
          })
        : await this.prisma.facility.findMany({
            where: {
              active: true,
              type: 'MANDI',
            },
          });

    const facilityById = new Map(facilities.map((facility) => [facility.id, facility]));
    const facilityByKey = new Map(
      facilities.map((facility) => [
        createMandiKey(facility.name, facility.district, facility.state),
        facility,
      ]),
    );

    const historyRecords = records.length
      ? await this.prisma.marketRecord.findMany({
          where: {
            OR: records.map((record) => ({
              cropName: {
                equals: record.cropName,
                mode: 'insensitive',
              },
              mandiName: {
                equals: record.mandiName,
                mode: 'insensitive',
              },
              state: {
                equals: record.state,
                mode: 'insensitive',
              },
            })),
          },
          orderBy: [{ recordDate: 'desc' }],
        })
      : [];

    const historyByKey = groupMarketHistory(historyRecords);

    return records
      .map((record) => {
        const mandiKey = createMandiKey(record.mandiName, record.district, record.state);
        const linkedFacility =
          (record.facilityId ? facilityById.get(record.facilityId) : undefined) ??
          facilityByKey.get(mandiKey) ??
          null;
        const distanceKm =
          includeDistance &&
          latitude != null &&
          longitude != null &&
          linkedFacility
            ? haversineDistanceKm(
                { latitude, longitude },
                {
                  latitude: linkedFacility.latitude,
                  longitude: linkedFacility.longitude,
                },
              )
            : null;

        const history = historyByKey.get(createHistoryKey(record)) ?? [];
        const previousRecord = resolvePreviousRecord(record, history);
        const deltaFromPrevious =
          previousRecord != null
            ? Number((record.priceModal - previousRecord.priceModal).toFixed(0))
            : null;
        const trendDirection =
          deltaFromPrevious == null || Math.abs(deltaFromPrevious) < 10
            ? 'STABLE'
            : deltaFromPrevious > 0
              ? 'UP'
              : 'DOWN';

        return {
          ...record,
          cropKey: createCropKey(record.cropName),
          deltaFromPrevious,
          distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
          facilityId: linkedFacility?.id ?? record.facilityId ?? null,
          freshnessLabel: formatFreshnessLabel(new Date(record.recordDate)),
          linkedFacility,
          mandiKey,
          trendDirection,
          trendLabel:
            trendDirection === 'UP'
              ? `Up by Rs ${Math.abs(deltaFromPrevious ?? 0)}`
              : trendDirection === 'DOWN'
                ? `Down by Rs ${Math.abs(deltaFromPrevious ?? 0)}`
                : 'Stable',
        } satisfies EnrichedMarketRecord;
      })
      .sort((left, right) => {
        if (includeDistance && left.distanceKm != null && right.distanceKm != null) {
          return left.distanceKm - right.distanceKm;
        }

        return right.priceModal - left.priceModal;
      });
  }
}

function buildCropSummary(records: EnrichedMarketRecord[]) {
  const latestRecord = records
    .slice()
    .sort(
      (left, right) =>
        new Date(right.recordDate).getTime() - new Date(left.recordDate).getTime(),
    )[0] ?? null;
  const bestRecord = records
    .slice()
    .sort((left, right) => right.priceModal - left.priceModal)[0] ?? null;
  const nearestRecord =
    records
      .filter((record) => record.distanceKm != null)
      .sort(
        (left, right) =>
          (left.distanceKm ?? Number.POSITIVE_INFINITY) -
          (right.distanceKm ?? Number.POSITIVE_INFINITY),
      )[0] ?? null;

  return {
    bestRecord: serializeRecord(bestRecord),
    cropKey: records[0]?.cropKey ?? '',
    cropName: records[0]?.cropName ?? '',
    freshnessLabel: latestRecord?.freshnessLabel ?? 'No recent update',
    latestRecord: serializeRecord(latestRecord),
    mandiCount: new Set(records.map((record) => record.mandiKey)).size,
    nearestRecord: serializeRecord(nearestRecord),
    trendDirection: latestRecord?.trendDirection ?? null,
    trendLabel: latestRecord?.trendLabel ?? 'Stable',
  };
}

function buildMandiSummary(records: EnrichedMarketRecord[]) {
  const freshestRecord = records
    .slice()
    .sort(
      (left, right) =>
        new Date(right.recordDate).getTime() - new Date(left.recordDate).getTime(),
    )[0] ?? null;
  const topRecord = records
    .slice()
    .sort((left, right) => right.priceModal - left.priceModal)[0] ?? null;

  return {
    cropCount: new Set(records.map((record) => record.cropKey)).size,
    district: records[0]?.district ?? '',
    distanceKm:
      records.find((record) => record.distanceKm != null)?.distanceKm ?? null,
    freshestRecord: serializeRecord(freshestRecord),
    hasLinkedFacility: Boolean(records[0]?.linkedFacility),
    linkedFacilityId: records[0]?.linkedFacility?.id ?? null,
    mandiKey: records[0]?.mandiKey ?? '',
    mandiName: records[0]?.mandiName ?? '',
    state: records[0]?.state ?? '',
    topRecord: serializeRecord(topRecord),
  };
}

function buildLinkedFacilitySummary(
  facility: Facility,
  latitude?: number,
  longitude?: number,
) {
  const distanceKm =
    latitude != null && longitude != null
      ? haversineDistanceKm(
          { latitude, longitude },
          {
            latitude: facility.latitude,
            longitude: facility.longitude,
          },
        )
      : null;

  return {
    distanceBucket:
      distanceKm == null ? 'Location needed' : describeDistanceBucket(distanceKm),
    distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
    district: facility.district,
    id: facility.id,
    name: facility.name,
    primaryServiceLabel: 'Nearby mandi sale point',
    services: facility.services,
    state: facility.state,
    travelHint:
      distanceKm == null
        ? 'Enable location to estimate travel effort'
        : buildTravelHint(distanceKm, facility.type),
    type: facility.type,
    village: facility.village,
  };
}

function buildPageInfo(totalCount: number, page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const startIndex = (safePage - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;

  return {
    endIndex,
    meta: {
      hasMore: endIndex < totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalCount,
    },
    startIndex,
  };
}

function serializeRecord(record: EnrichedMarketRecord | null) {
  if (!record) {
    return null;
  }

  return {
    cropName: record.cropName,
    deltaFromPrevious: record.deltaFromPrevious,
    distanceKm: record.distanceKm,
    district: record.district,
    facilityId: record.facilityId,
    freshnessLabel: record.freshnessLabel,
    id: record.id,
    mandiName: record.mandiName,
    priceMax: record.priceMax,
    priceMin: record.priceMin,
    priceModal: record.priceModal,
    recordDate: record.recordDate,
    source: record.source,
    state: record.state,
    trendDirection: record.trendDirection,
    trendLabel: record.trendLabel,
  };
}

function groupByKey<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  }

  return map;
}

function createCropKey(cropName: string) {
  return slugify(cropName);
}

function createMandiKey(name: string, district: string, state: string) {
  return `${slugify(name)}--${slugify(district)}--${slugify(state)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createHistoryKey(
  record: Pick<NormalizedMarketRecord, 'cropName' | 'mandiName' | 'state'>,
) {
  return `${record.cropName}|${record.mandiName}|${record.state}`.trim().toLowerCase();
}

function groupMarketHistory(records: PrismaMarketRecord[]) {
  const map = new Map<string, PrismaMarketRecord[]>();

  for (const record of records) {
    const key = createHistoryKey(record);
    const group = map.get(key) ?? [];
    group.push(record);
    map.set(key, group);
  }

  return map;
}

function resolvePreviousRecord(
  record: NormalizedMarketRecord,
  history: PrismaMarketRecord[],
) {
  const recordDate = new Date(record.recordDate).getTime();

  return history.find((item) => item.recordDate.getTime() < recordDate) ?? null;
}

function describeDistanceBucket(distanceKm: number) {
  if (distanceKm <= 15) {
    return 'Close by';
  }

  if (distanceKm <= 40) {
    return 'Moderate trip';
  }

  return 'Longer travel';
}

function buildTravelHint(distanceKm: number, type: 'MANDI' | 'WAREHOUSE') {
  if (distanceKm <= 15) {
    return type === 'MANDI'
      ? 'Easy same-day mandi run'
      : 'Easy same-day storage drop';
  }

  if (distanceKm <= 40) {
    return type === 'MANDI'
      ? 'Worth comparing transport cost before selling'
      : 'Good backup option if you plan to store produce';
  }

  return type === 'MANDI'
    ? 'Travel is longer, so compare price gain against transport cost'
    : 'Use only if storage access outweighs the extra distance';
}

function formatFreshnessLabel(recordDate: Date) {
  const days = Math.max(0, diffInDays(recordDate, new Date()));

  if (days === 0) {
    return 'Updated today';
  }

  if (days === 1) {
    return 'Updated yesterday';
  }

  return `Updated ${days} days ago`;
}
