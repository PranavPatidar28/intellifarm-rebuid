import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

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
};

export interface MarketProvider {
  listMarketRecords(query: MarketQueryInput): Promise<NormalizedMarketRecord[]>;
}

export const MARKET_PROVIDER = Symbol('MARKET_PROVIDER');

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
      take: 50,
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

@Injectable()
export class DataGovMarketProvider implements MarketProvider {
  constructor(private readonly configService: ConfigService) {}

  async listMarketRecords(query: MarketQueryInput) {
    const resourceId = this.configService.get<string>('DATA_GOV_RESOURCE_ID');
    const apiKey = this.configService.get<string>('DATA_GOV_API_KEY');
    const baseUrl = this.configService.get<string>(
      'DATA_GOV_MARKET_BASE_URL',
      'https://api.data.gov.in/resource',
    );

    if (!resourceId || !apiKey) {
      throw new Error('Data.gov market provider is not configured');
    }

    const params = new URLSearchParams({
      'api-key': apiKey,
      format: 'json',
      limit: '25',
    });

    if (query.cropName) {
      params.set('filters[commodity]', query.cropName);
    }

    if (query.state) {
      params.set('filters[state]', query.state);
    }

    if (query.district) {
      params.set('filters[district]', query.district);
    }

    const response = await fetch(
      `${baseUrl}/${resourceId}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(
        `Data.gov market provider failed with ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      records?: Array<Record<string, unknown>>;
    };

    return (payload.records ?? [])
      .map((record, index) => normalizeLiveRecord(record, index))
      .filter(
        (record): record is NormalizedMarketRecord =>
          record != null && Number.isFinite(record.priceModal),
      );
  }
}

function normalizeLiveRecord(
  record: Record<string, unknown>,
  index: number,
): NormalizedMarketRecord | null {
  const cropName =
    readString(record.commodity) ??
    readString(record.crop_name) ??
    readString(record.crop) ??
    null;
  const mandiName =
    readString(record.market) ??
    readString(record.mandi_name) ??
    readString(record.market_name) ??
    null;
  const district =
    readString(record.district) ?? readString(record.district_name) ?? '';
  const state = readString(record.state) ?? readString(record.state_name) ?? '';
  const priceMin = readNumber(
    record.min_price ?? record.price_min ?? record.min,
  );
  const priceMax = readNumber(
    record.max_price ?? record.price_max ?? record.max,
  );
  const priceModal = readNumber(
    record.modal_price ?? record.price_modal ?? record.modal,
  );
  const recordDate =
    readString(record.arrival_date) ??
    readString(record.record_date) ??
    new Date().toISOString().slice(0, 10);

  if (!cropName || !mandiName || !Number.isFinite(priceModal)) {
    return null;
  }

  return {
    id: `live-${index}-${cropName}-${mandiName}`
      .replace(/\s+/g, '-')
      .toLowerCase(),
    facilityId: null,
    cropName,
    mandiName,
    district,
    state,
    priceMin: Number.isFinite(priceMin) ? priceMin : priceModal,
    priceMax: Number.isFinite(priceMax) ? priceMax : priceModal,
    priceModal,
    recordDate: new Date(recordDate).toISOString(),
    source: 'Data.gov live feed',
  };
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}
