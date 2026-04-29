import { Inject, Injectable } from '@nestjs/common';
import type { MarketRecord } from '@prisma/client';

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
    });

    const stateFilter = query.state || user?.state || undefined;
    const districtFilter = query.district || user?.district || undefined;

    let records: NormalizedMarketRecord[];
    try {
      records = await this.marketProvider.listMarketRecords({
        cropName: query.cropName,
        state: stateFilter,
        district: districtFilter,
      });
    } catch {
      records = await this.prisma.marketRecord
        .findMany({
          where: {
            ...(query.cropName
              ? {
                  cropName: {
                    contains: query.cropName,
                    mode: 'insensitive',
                  },
                }
              : {}),
            ...(stateFilter
              ? {
                  state: {
                    equals: stateFilter,
                    mode: 'insensitive',
                  },
                }
              : {}),
            ...(districtFilter
              ? {
                  district: {
                    contains: districtFilter,
                    mode: 'insensitive',
                  },
                }
              : {}),
          },
          orderBy: [{ recordDate: 'desc' }, { priceModal: 'desc' }],
          take: 50,
        })
        .then((items) =>
          items.map((item) => ({
            id: item.id,
            facilityId: item.facilityId,
            cropName: item.cropName,
            mandiName: item.mandiName,
            district: item.district,
            state: item.state,
            priceMin: item.priceMin,
            priceMax: item.priceMax,
            priceModal: item.priceModal,
            recordDate: item.recordDate.toISOString(),
            source: item.source,
          })),
        );
    }

    const facilities =
      query.latitude != null && query.longitude != null
        ? await this.prisma.facility.findMany({
            where: {
              active: true,
              type: 'MANDI',
            },
          })
        : [];

    const facilityById = new Map(
      facilities.map((facility) => [facility.id, facility]),
    );
    const facilityByKey = new Map(
      facilities.map((facility) => [
        createFacilityKey(facility.name, facility.district, facility.state),
        facility,
      ]),
    );

    const historyKeys = Array.from(
      new Set(records.map((record) => createHistoryKey(record))),
    );
    const historyRecords = historyKeys.length
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

    const enrichedRecords = records
      .map((record) => {
        const facility =
          (record.facilityId
            ? facilityById.get(record.facilityId)
            : undefined) ??
          facilityByKey.get(
            createFacilityKey(record.mandiName, record.district, record.state),
          );

        const distanceKm =
          query.includeDistance &&
          query.latitude != null &&
          query.longitude != null &&
          facility
            ? haversineDistanceKm(
                { latitude: query.latitude, longitude: query.longitude },
                {
                  latitude: facility.latitude,
                  longitude: facility.longitude,
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
          distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
          trendDirection,
          trendLabel:
            trendDirection === 'UP'
              ? `Up by ₹${Math.abs(deltaFromPrevious ?? 0)}`
              : trendDirection === 'DOWN'
                ? `Down by ₹${Math.abs(deltaFromPrevious ?? 0)}`
                : 'Stable',
          deltaFromPrevious,
          freshnessLabel: formatFreshnessLabel(new Date(record.recordDate)),
        };
      })
      .sort((left, right) => {
        if (
          query.includeDistance &&
          left.distanceKm != null &&
          right.distanceKm != null
        ) {
          return left.distanceKm - right.distanceKm;
        }

        return right.priceModal - left.priceModal;
      });

    const bestRecord = enrichedRecords.length
      ? enrichedRecords
          .slice()
          .sort((left, right) => right.priceModal - left.priceModal)[0]
      : null;
    const topNearby = enrichedRecords
      .filter((record) => record.distanceKm != null)
      .slice(0, 3);
    const recommendedRecord =
      topNearby[0] && bestRecord
        ? topNearby[0].priceModal + 75 >= bestRecord.priceModal
          ? topNearby[0]
          : bestRecord
        : topNearby[0] ?? bestRecord;

    return {
      generatedAt: new Date().toISOString(),
      cropName: query.cropName ?? null,
      records: query.bestPriceOnly
        ? bestRecord
          ? [bestRecord]
          : []
        : enrichedRecords.slice(0, 20),
      bestRecord,
      recommendedRecord,
      topNearby,
    };
  }
}

function createFacilityKey(name: string, district: string, state: string) {
  return `${name}|${district}|${state}`.trim().toLowerCase();
}

function createHistoryKey(record: Pick<NormalizedMarketRecord, 'cropName' | 'mandiName' | 'state'>) {
  return `${record.cropName}|${record.mandiName}|${record.state}`.trim().toLowerCase();
}

function groupMarketHistory(records: MarketRecord[]) {
  const map = new Map<string, MarketRecord[]>();

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
  history: MarketRecord[],
) {
  const recordDate = new Date(record.recordDate).getTime();

  return history.find((item) => item.recordDate.getTime() < recordDate) ?? null;
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
