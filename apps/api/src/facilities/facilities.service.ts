import { Injectable, NotFoundException } from '@nestjs/common';

import { haversineDistanceKm } from '../common/utils/geo.util';
import { PrismaService } from '../prisma/prisma.service';

type NearbyFacilitiesQuery = {
  latitude: number;
  longitude: number;
  cropName?: string;
  radiusKm?: number;
  types?: Array<'MANDI' | 'WAREHOUSE'>;
};

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listNearbyFacilities(userId: string, query: NearbyFacilitiesQuery) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const facilities = await this.prisma.facility.findMany({
      where: {
        active: true,
        ...(query.types?.length ? { type: { in: query.types } } : {}),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const withDistance = facilities
      .map((facility) => ({
        facility,
        distanceKm: haversineDistanceKm(
          { latitude: query.latitude, longitude: query.longitude },
          {
            latitude: facility.latitude,
            longitude: facility.longitude,
          },
        ),
      }))
      .filter((item) => item.distanceKm <= (query.radiusKm ?? 150))
      .sort((left, right) => left.distanceKm - right.distanceKm);

    const facilityIds = withDistance.map((item) => item.facility.id);
    const latestMarketRecords = facilityIds.length
      ? await this.prisma.marketRecord.findMany({
          where: {
            facilityId: { in: facilityIds },
            ...(query.cropName
              ? {
                  cropName: {
                    contains: query.cropName,
                    mode: 'insensitive',
                  },
                }
              : {}),
          },
          orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        })
      : [];

    const latestRecordByFacilityId = new Map<
      string,
      (typeof latestMarketRecords)[number]
    >();
    for (const record of latestMarketRecords) {
      if (
        record.facilityId &&
        !latestRecordByFacilityId.has(record.facilityId)
      ) {
        latestRecordByFacilityId.set(record.facilityId, record);
      }
    }

    return {
      facilities: withDistance.map(({ facility, distanceKm }) => {
        const latestMarket =
          facility.type === 'MANDI'
            ? (latestRecordByFacilityId.get(facility.id) ?? null)
            : null;

        return {
          id: facility.id,
          type: facility.type,
          name: facility.name,
          district: facility.district,
          state: facility.state,
          village: facility.village,
          latitude: facility.latitude,
          longitude: facility.longitude,
          distanceKm: Number(distanceKm.toFixed(1)),
          services: facility.services,
          latestMarket: latestMarket
            ? {
                cropName: latestMarket.cropName,
                mandiName: latestMarket.mandiName,
                priceMin: latestMarket.priceMin,
                priceMax: latestMarket.priceMax,
                priceModal: latestMarket.priceModal,
                recordDate: latestMarket.recordDate.toISOString(),
                source: latestMarket.source,
              }
            : null,
        };
      }),
    };
  }
}
