import type {
  MarketCropDetailResponse,
  MarketMandiDetailResponse,
} from '@/lib/api-types';
import {
  buildCropKey,
  buildMandiKey,
  type MarketPinnedCrop,
} from '@/lib/market-explorer';

type MarketTrendDirection = 'UP' | 'DOWN' | 'STABLE';

export type MarketTradeMode = 'buy' | 'sell';

export type MockCropSummary = {
  cropKey: string;
  cropName: string;
  latestPrice: number | null;
  trendLabel: string;
  freshnessLabel: string;
  bestMandiName: string | null;
  bestPrice: number | null;
  nearestMandiName: string | null;
  nearestDistanceKm: number | null;
  mandiCount: number;
  hasLiveData: boolean;
};

export type MockMandiSummary = {
  mandiKey: string;
  mandiName: string;
  district: string;
  state: string;
  distanceKm: number | null;
  cropCount: number;
  topCropName: string | null;
  topPrice: number | null;
  freshnessLabel: string;
  hasLinkedFacility: boolean;
};

type MockMarketRecord = MarketCropDetailResponse['crop']['records'][number];

type MockQuoteSeed = {
  cropName: string;
  mandiName: string;
  district: string;
  state: string;
  distanceKm: number | null;
  basePrice: number;
  spread: number;
  range: number;
  recordDate: string;
  freshnessLabel: string;
  trendDirection: MarketTrendDirection;
  source?: string;
};

const generatedAt = '2026-04-30T09:30:00.000Z';

const cropCatalog = [
  'Banana',
  'Chana',
  'Cotton',
  'Groundnut',
  'Maize',
  'Mustard',
  'Onion',
  'Paddy',
  'Potato',
  'Soybean',
  'Tomato',
  'Turmeric',
  'Wheat',
] as const;

const linkedFacilities = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    mandiKey: buildMandiKey('Azadpur Mandi', 'North West Delhi', 'Delhi'),
    type: 'WAREHOUSE' as const,
    name: 'Azadpur Cold Chain Hub',
    district: 'North West Delhi',
    state: 'Delhi',
    village: null,
    distanceKm: 24,
    distanceBucket: '20-30 km',
    travelHint: 'Cold storage and grading are available around the mandi gate.',
    primaryServiceLabel: 'Cold storage and sorting',
    services: ['Cold storage', 'Sorting', 'Dispatch support'],
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    mandiKey: buildMandiKey('Lasalgaon Mandi', 'Nashik', 'Maharashtra'),
    type: 'WAREHOUSE' as const,
    name: 'Lasalgaon Onion Store',
    district: 'Nashik',
    state: 'Maharashtra',
    village: null,
    distanceKm: 33,
    distanceBucket: '30-40 km',
    travelHint: 'Useful when arrivals are high and you want to stagger sales.',
    primaryServiceLabel: 'Storage for onion lots',
    services: ['Warehouse', 'Dry storage', 'Loading support'],
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    mandiKey: buildMandiKey('Guntur Mirchi Yard', 'Guntur', 'Andhra Pradesh'),
    type: 'MANDI' as const,
    name: 'Guntur Market Support Center',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    village: null,
    distanceKm: 41,
    distanceBucket: '40+ km',
    travelHint: 'Auction assistance and trader matching are available nearby.',
    primaryServiceLabel: 'Auction and dispatch support',
    services: ['Auction help', 'Dispatch', 'Trader network'],
  },
];

const quoteSeeds: MockQuoteSeed[] = [
  {
    cropName: 'Wheat',
    mandiName: 'Karnal Grain Market',
    district: 'Karnal',
    state: 'Haryana',
    distanceKm: 12,
    basePrice: 2380,
    spread: 40,
    range: 70,
    recordDate: '2026-04-30T08:10:00.000Z',
    freshnessLabel: 'Updated 1h ago',
    trendDirection: 'UP',
  },
  {
    cropName: 'Wheat',
    mandiName: 'Azadpur Mandi',
    district: 'North West Delhi',
    state: 'Delhi',
    distanceKm: 26,
    basePrice: 2430,
    spread: 50,
    range: 80,
    recordDate: '2026-04-30T07:20:00.000Z',
    freshnessLabel: 'Updated 2h ago',
    trendDirection: 'UP',
  },
  {
    cropName: 'Wheat',
    mandiName: 'Ludhiana Grain Market',
    district: 'Ludhiana',
    state: 'Punjab',
    distanceKm: 31,
    basePrice: 2410,
    spread: 35,
    range: 65,
    recordDate: '2026-04-29T16:00:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Paddy',
    mandiName: 'Karnal Grain Market',
    district: 'Karnal',
    state: 'Haryana',
    distanceKm: 12,
    basePrice: 2240,
    spread: 25,
    range: 60,
    recordDate: '2026-04-30T06:50:00.000Z',
    freshnessLabel: 'Updated 3h ago',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Paddy',
    mandiName: 'Patna City Mandi',
    district: 'Patna',
    state: 'Bihar',
    distanceKm: 47,
    basePrice: 2200,
    spread: 20,
    range: 55,
    recordDate: '2026-04-29T13:30:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Paddy',
    mandiName: 'Ludhiana Grain Market',
    district: 'Ludhiana',
    state: 'Punjab',
    distanceKm: 31,
    basePrice: 2280,
    spread: 30,
    range: 60,
    recordDate: '2026-04-29T11:00:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'UP',
  },
  {
    cropName: 'Maize',
    mandiName: 'Indore Chhawani Mandi',
    district: 'Indore',
    state: 'Madhya Pradesh',
    distanceKm: 18,
    basePrice: 2110,
    spread: 30,
    range: 55,
    recordDate: '2026-04-30T09:00:00.000Z',
    freshnessLabel: 'Updated now',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Maize',
    mandiName: 'Kota Agri Market',
    district: 'Kota',
    state: 'Rajasthan',
    distanceKm: 22,
    basePrice: 2070,
    spread: 20,
    range: 50,
    recordDate: '2026-04-29T15:10:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Maize',
    mandiName: 'Patna City Mandi',
    district: 'Patna',
    state: 'Bihar',
    distanceKm: 47,
    basePrice: 2040,
    spread: 15,
    range: 45,
    recordDate: '2026-04-29T09:30:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Cotton',
    mandiName: 'Guntur Mirchi Yard',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    distanceKm: 42,
    basePrice: 7080,
    spread: 80,
    range: 120,
    recordDate: '2026-04-30T07:40:00.000Z',
    freshnessLabel: 'Updated 2h ago',
    trendDirection: 'UP',
  },
  {
    cropName: 'Cotton',
    mandiName: 'Indore Chhawani Mandi',
    district: 'Indore',
    state: 'Madhya Pradesh',
    distanceKm: 18,
    basePrice: 6970,
    spread: 40,
    range: 110,
    recordDate: '2026-04-29T14:20:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'UP',
  },
  {
    cropName: 'Cotton',
    mandiName: 'Kota Agri Market',
    district: 'Kota',
    state: 'Rajasthan',
    distanceKm: 22,
    basePrice: 6900,
    spread: 40,
    range: 100,
    recordDate: '2026-04-28T17:10:00.000Z',
    freshnessLabel: 'Updated 2 days ago',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Mustard',
    mandiName: 'Kota Agri Market',
    district: 'Kota',
    state: 'Rajasthan',
    distanceKm: 22,
    basePrice: 5940,
    spread: 40,
    range: 90,
    recordDate: '2026-04-30T07:05:00.000Z',
    freshnessLabel: 'Updated 2h ago',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Mustard',
    mandiName: 'Indore Chhawani Mandi',
    district: 'Indore',
    state: 'Madhya Pradesh',
    distanceKm: 18,
    basePrice: 5860,
    spread: 30,
    range: 85,
    recordDate: '2026-04-29T10:00:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Soybean',
    mandiName: 'Indore Chhawani Mandi',
    district: 'Indore',
    state: 'Madhya Pradesh',
    distanceKm: 18,
    basePrice: 4680,
    spread: 40,
    range: 75,
    recordDate: '2026-04-30T08:45:00.000Z',
    freshnessLabel: 'Updated 1h ago',
    trendDirection: 'UP',
  },
  {
    cropName: 'Soybean',
    mandiName: 'Kota Agri Market',
    district: 'Kota',
    state: 'Rajasthan',
    distanceKm: 22,
    basePrice: 4630,
    spread: 30,
    range: 70,
    recordDate: '2026-04-29T12:40:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Onion',
    mandiName: 'Lasalgaon Mandi',
    district: 'Nashik',
    state: 'Maharashtra',
    distanceKm: 34,
    basePrice: 1840,
    spread: 40,
    range: 80,
    recordDate: '2026-04-30T08:25:00.000Z',
    freshnessLabel: 'Updated 1h ago',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Onion',
    mandiName: 'Azadpur Mandi',
    district: 'North West Delhi',
    state: 'Delhi',
    distanceKm: 26,
    basePrice: 1910,
    spread: 50,
    range: 80,
    recordDate: '2026-04-30T06:15:00.000Z',
    freshnessLabel: 'Updated 3h ago',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Onion',
    mandiName: 'Patna City Mandi',
    district: 'Patna',
    state: 'Bihar',
    distanceKm: 47,
    basePrice: 1810,
    spread: 20,
    range: 70,
    recordDate: '2026-04-29T10:25:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Tomato',
    mandiName: 'Azadpur Mandi',
    district: 'North West Delhi',
    state: 'Delhi',
    distanceKm: 26,
    basePrice: 1300,
    spread: 20,
    range: 55,
    recordDate: '2026-04-30T08:00:00.000Z',
    freshnessLabel: 'Updated 1h ago',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Tomato',
    mandiName: 'Guntur Mirchi Yard',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    distanceKm: 42,
    basePrice: 1260,
    spread: 20,
    range: 55,
    recordDate: '2026-04-29T15:50:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'UP',
  },
  {
    cropName: 'Tomato',
    mandiName: 'Patna City Mandi',
    district: 'Patna',
    state: 'Bihar',
    distanceKm: 47,
    basePrice: 1180,
    spread: 10,
    range: 45,
    recordDate: '2026-04-29T09:00:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Potato',
    mandiName: 'Azadpur Mandi',
    district: 'North West Delhi',
    state: 'Delhi',
    distanceKm: 26,
    basePrice: 1700,
    spread: 40,
    range: 60,
    recordDate: '2026-04-30T07:55:00.000Z',
    freshnessLabel: 'Updated 2h ago',
    trendDirection: 'UP',
  },
  {
    cropName: 'Potato',
    mandiName: 'Karnal Grain Market',
    district: 'Karnal',
    state: 'Haryana',
    distanceKm: 12,
    basePrice: 1660,
    spread: 20,
    range: 55,
    recordDate: '2026-04-30T06:30:00.000Z',
    freshnessLabel: 'Updated 3h ago',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Potato',
    mandiName: 'Patna City Mandi',
    district: 'Patna',
    state: 'Bihar',
    distanceKm: 47,
    basePrice: 1600,
    spread: 20,
    range: 50,
    recordDate: '2026-04-29T11:20:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'DOWN',
  },
  {
    cropName: 'Chana',
    mandiName: 'Indore Chhawani Mandi',
    district: 'Indore',
    state: 'Madhya Pradesh',
    distanceKm: 18,
    basePrice: 5480,
    spread: 40,
    range: 80,
    recordDate: '2026-04-30T08:35:00.000Z',
    freshnessLabel: 'Updated 1h ago',
    trendDirection: 'STABLE',
  },
  {
    cropName: 'Chana',
    mandiName: 'Kota Agri Market',
    district: 'Kota',
    state: 'Rajasthan',
    distanceKm: 22,
    basePrice: 5440,
    spread: 40,
    range: 80,
    recordDate: '2026-04-29T14:05:00.000Z',
    freshnessLabel: 'Updated yesterday',
    trendDirection: 'UP',
  },
  {
    cropName: 'Chana',
    mandiName: 'Patna City Mandi',
    district: 'Patna',
    state: 'Bihar',
    distanceKm: 47,
    basePrice: 5390,
    spread: 20,
    range: 70,
    recordDate: '2026-04-28T16:00:00.000Z',
    freshnessLabel: 'Updated 2 days ago',
    trendDirection: 'STABLE',
  },
];

export const mockCropOptions = cropCatalog.map((cropName) => ({
  label: cropName,
  value: buildCropKey(cropName),
}));

function sortByRecordDateDescending(a: MockMarketRecord, b: MockMarketRecord) {
  return new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime();
}

function sortForMode(
  records: MockMarketRecord[],
  mode: MarketTradeMode,
) {
  return [...records].sort((a, b) => {
    if (mode === 'sell') {
      return b.priceModal - a.priceModal || sortByRecordDateDescending(a, b);
    }

    return a.priceModal - b.priceModal || sortByRecordDateDescending(a, b);
  });
}

function sortByDistance(records: MockMarketRecord[]) {
  return [...records].sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) {
      return 0;
    }

    if (a.distanceKm == null) {
      return 1;
    }

    if (b.distanceKm == null) {
      return -1;
    }

    return a.distanceKm - b.distanceKm;
  });
}

function getTradeLabel(
  direction: MarketTrendDirection,
  mode: MarketTradeMode,
) {
  if (mode === 'sell') {
    if (direction === 'UP') {
      return 'Rates rising';
    }

    if (direction === 'DOWN') {
      return 'Rates softening';
    }

    return 'Rates steady';
  }

  if (direction === 'DOWN') {
    return 'Good buying window';
  }

  if (direction === 'UP') {
    return 'Buying is costlier';
  }

  return 'Buying rate steady';
}

function getDelta(direction: MarketTrendDirection, spread: number) {
  if (direction === 'UP') {
    return spread;
  }

  if (direction === 'DOWN') {
    return -spread;
  }

  return 0;
}

function toMarketRecord(
  seed: MockQuoteSeed,
  mode: MarketTradeMode,
): MockMarketRecord {
  const mandiKey = buildMandiKey(seed.mandiName, seed.district, seed.state);
  const facilityId =
    linkedFacilities.find((item) => item.mandiKey === mandiKey)?.id ?? null;
  const priceModal =
    mode === 'sell' ? seed.basePrice + seed.spread : seed.basePrice - seed.spread;

  return {
    id: `mock-${buildCropKey(seed.cropName)}-${mandiKey}`,
    facilityId,
    cropName: seed.cropName,
    mandiName: seed.mandiName,
    district: seed.district,
    state: seed.state,
    priceMin: Math.max(priceModal - seed.range, 0),
    priceMax: priceModal + Math.round(seed.range * 0.8),
    priceModal,
    recordDate: seed.recordDate,
    source: seed.source ?? 'Mock mandi board',
    distanceKm: seed.distanceKm,
    trendDirection: seed.trendDirection,
    trendLabel: getTradeLabel(seed.trendDirection, mode),
    deltaFromPrevious: getDelta(seed.trendDirection, seed.spread),
    freshnessLabel: seed.freshnessLabel,
  };
}

function getAllRecords(mode: MarketTradeMode) {
  return quoteSeeds.map((seed) => toMarketRecord(seed, mode));
}

function groupByCrop(records: MockMarketRecord[]) {
  return records.reduce<Map<string, MockMarketRecord[]>>((acc, record) => {
    const bucket = acc.get(record.cropName) ?? [];
    bucket.push(record);
    acc.set(record.cropName, bucket);
    return acc;
  }, new Map());
}

function groupByMandi(records: MockMarketRecord[]) {
  return records.reduce<Map<string, MockMarketRecord[]>>((acc, record) => {
    const mandiKey = buildMandiKey(record.mandiName, record.district, record.state);
    const bucket = acc.get(mandiKey) ?? [];
    bucket.push(record);
    acc.set(mandiKey, bucket);
    return acc;
  }, new Map());
}

function findCatalogCropName(cropName: string) {
  return (
    cropCatalog.find(
      (item) => item.toLowerCase() === cropName.trim().toLowerCase(),
    ) ?? null
  );
}

function buildCropFallback(cropName: string): MockCropSummary {
  return {
    cropKey: buildCropKey(cropName),
    cropName,
    latestPrice: null,
    trendLabel: 'Watching this crop',
    freshnessLabel: 'No live quote right now',
    bestMandiName: null,
    bestPrice: null,
    nearestMandiName: null,
    nearestDistanceKm: null,
    mandiCount: 0,
    hasLiveData: false,
  };
}

export function getMockCropSummaries(mode: MarketTradeMode): MockCropSummary[] {
  const records = getAllRecords(mode);
  const cropGroups = groupByCrop(records);

  return [...cropGroups.entries()]
    .map(([cropName, cropRecords]) => {
      const latestRecord = [...cropRecords].sort(sortByRecordDateDescending)[0] ?? null;
      const bestRecord = sortForMode(cropRecords, mode)[0] ?? null;
      const nearestRecord = sortByDistance(cropRecords)[0] ?? null;

      return {
        cropKey: buildCropKey(cropName),
        cropName,
        latestPrice: bestRecord?.priceModal ?? latestRecord?.priceModal ?? null,
        trendLabel: bestRecord?.trendLabel ?? latestRecord?.trendLabel ?? 'Rates steady',
        freshnessLabel: latestRecord?.freshnessLabel ?? 'No recent update',
        bestMandiName: bestRecord?.mandiName ?? null,
        bestPrice: bestRecord?.priceModal ?? null,
        nearestMandiName: nearestRecord?.mandiName ?? null,
        nearestDistanceKm: nearestRecord?.distanceKm ?? null,
        mandiCount: new Set(
          cropRecords.map((record) =>
            buildMandiKey(record.mandiName, record.district, record.state),
          ),
        ).size,
        hasLiveData: cropRecords.length > 0,
      } satisfies MockCropSummary;
    })
    .sort((a, b) => {
      if (a.bestPrice == null && b.bestPrice == null) {
        return a.cropName.localeCompare(b.cropName);
      }

      if (a.bestPrice == null) {
        return 1;
      }

      if (b.bestPrice == null) {
        return -1;
      }

      if (mode === 'sell') {
        return b.bestPrice - a.bestPrice;
      }

      return a.bestPrice - b.bestPrice;
    });
}

export function getMockMandiSummaries(mode: MarketTradeMode): MockMandiSummary[] {
  const records = getAllRecords(mode);
  const mandiGroups = groupByMandi(records);

  return [...mandiGroups.entries()]
    .map(([mandiKey, mandiRecords]) => {
      const reference = mandiRecords[0];
      const topRecord = sortForMode(mandiRecords, mode)[0] ?? null;
      const freshestRecord =
        [...mandiRecords].sort(sortByRecordDateDescending)[0] ?? null;

      return {
        mandiKey,
        mandiName: reference.mandiName,
        district: reference.district,
        state: reference.state,
        distanceKm: sortByDistance(mandiRecords)[0]?.distanceKm ?? null,
        cropCount: new Set(mandiRecords.map((record) => record.cropName)).size,
        topCropName: topRecord?.cropName ?? null,
        topPrice: topRecord?.priceModal ?? null,
        freshnessLabel: freshestRecord?.freshnessLabel ?? 'No recent update',
        hasLinkedFacility: linkedFacilities.some((item) => item.mandiKey === mandiKey),
      } satisfies MockMandiSummary;
    })
    .sort((a, b) => {
      if (a.topPrice == null && b.topPrice == null) {
        return a.mandiName.localeCompare(b.mandiName);
      }

      if (a.topPrice == null) {
        return 1;
      }

      if (b.topPrice == null) {
        return -1;
      }

      if (mode === 'sell') {
        return b.topPrice - a.topPrice;
      }

      return a.topPrice - b.topPrice;
    });
}

export function getMockPinnedCropItems(
  pinnedCrops: MarketPinnedCrop[],
  mode: MarketTradeMode,
) {
  const summaryMap = new Map(
    getMockCropSummaries(mode).map((item) => [item.cropKey, item]),
  );

  return pinnedCrops.map((item) => summaryMap.get(item.cropKey) ?? buildCropFallback(item.cropName));
}

export function getMockCropDetail(
  cropName: string,
  mode: MarketTradeMode,
): MarketCropDetailResponse | null {
  const resolvedCropName = findCatalogCropName(cropName) ?? cropName.trim();

  if (!resolvedCropName) {
    return null;
  }

  const records = getAllRecords(mode).filter(
    (record) => record.cropName.toLowerCase() === resolvedCropName.toLowerCase(),
  );
  const sortedRecords = sortForMode(records, mode);
  const nearestRecord = sortByDistance(records)[0] ?? null;

  return {
    generatedAt,
    crop: {
      cropKey: buildCropKey(resolvedCropName),
      cropName: resolvedCropName,
      scope: 'district',
      bestRecord: sortedRecords[0] ?? null,
      nearestRecord,
      nearbyRecords: sortByDistance(records).slice(0, 3),
      records: sortedRecords,
      mandiCount: new Set(
        records.map((record) =>
          buildMandiKey(record.mandiName, record.district, record.state),
        ),
      ).size,
    },
  };
}

export function getMockMandiDetail(
  mandiKey: string,
  mode: MarketTradeMode,
): MarketMandiDetailResponse | null {
  const records = getAllRecords(mode).filter(
    (record) =>
      buildMandiKey(record.mandiName, record.district, record.state) === mandiKey,
  );

  if (!records.length) {
    return null;
  }

  const reference = records[0];
  const linkedFacility =
    linkedFacilities.find((item) => item.mandiKey === mandiKey) ?? null;

  return {
    generatedAt,
    mandi: {
      mandiKey,
      mandiName: reference.mandiName,
      district: reference.district,
      state: reference.state,
      scope: 'district',
      distanceKm: sortByDistance(records)[0]?.distanceKm ?? null,
      topRecord: sortForMode(records, mode)[0] ?? null,
      freshestRecord: [...records].sort(sortByRecordDateDescending)[0] ?? null,
      linkedFacility,
      records: sortForMode(records, mode),
      cropCount: new Set(records.map((record) => record.cropName)).size,
    },
  };
}
