import { Inject, Injectable } from '@nestjs/common';

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

        return {
          ...record,
          distanceKm: distanceKm != null ? Number(distanceKm.toFixed(1)) : null,
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

    return {
      records: query.bestPriceOnly
        ? bestRecord
          ? [bestRecord]
          : []
        : enrichedRecords.slice(0, 20),
      bestRecord,
    };
  }
}

function createFacilityKey(name: string, district: string, state: string) {
  return `${name}|${district}|${state}`.trim().toLowerCase();
}
