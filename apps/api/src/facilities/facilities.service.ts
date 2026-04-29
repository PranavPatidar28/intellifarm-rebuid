import { Injectable, NotFoundException } from '@nestjs/common';

import { diffInDays } from '../common/utils/date.util';
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
          distanceBucket: describeDistanceBucket(distanceKm),
          travelHint: buildTravelHint(distanceKm, facility.type),
          primaryServiceLabel:
            facility.type === 'MANDI'
              ? 'Nearby mandi sale point'
              : 'Storage and holding facility',
          services: facility.services,
          marketContext: latestMarket
            ? {
                cropName: latestMarket.cropName,
                mandiName: latestMarket.mandiName,
                priceMin: latestMarket.priceMin,
                priceMax: latestMarket.priceMax,
                priceModal: latestMarket.priceModal,
                recordDate: latestMarket.recordDate.toISOString(),
                source: latestMarket.source,
                trendDirection: 'STABLE' as const,
                trendLabel: 'Compare with the main mandi feed for the latest movement',
                freshnessLabel: formatFreshnessLabel(latestMarket.recordDate),
              }
            : null,
          recommendedUse:
            facility.type === 'MANDI'
              ? latestMarket
                ? `Useful for checking ${latestMarket.cropName} selling options close to your field.`
                : 'Useful for comparing nearby sale options before transport.'
              : 'Useful if you want to hold produce, compare prices later, or reduce immediate sell pressure.',
          latestMarket: latestMarket
            ? {
                cropName: latestMarket.cropName,
                mandiName: latestMarket.mandiName,
                priceMin: latestMarket.priceMin,
                priceMax: latestMarket.priceMax,
                priceModal: latestMarket.priceModal,
                recordDate: latestMarket.recordDate.toISOString(),
                source: latestMarket.source,
                trendDirection: 'STABLE' as const,
                trendLabel: 'Compare with the market tab for a broader trend view',
                freshnessLabel: formatFreshnessLabel(latestMarket.recordDate),
              }
            : null,
        };
      }),
    };
  }
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
