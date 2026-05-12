import {
  SeasonClimateService,
  getSeasonMonthRange,
} from './season-climate.service';

describe('getSeasonMonthRange', () => {
  it('returns Jun–Oct for Kharif', () => {
    expect(getSeasonMonthRange('KHARIF')).toEqual([6, 7, 8, 9, 10]);
  });

  it('returns Nov–Mar for Rabi', () => {
    expect(getSeasonMonthRange('RABI')).toEqual([11, 12, 1, 2, 3]);
  });

  it('returns Mar–Jun for Zaid', () => {
    expect(getSeasonMonthRange('ZAID')).toEqual([3, 4, 5, 6]);
  });

  it('returns all months for CUSTOM', () => {
    expect(getSeasonMonthRange('CUSTOM')).toHaveLength(12);
  });
});

describe('SeasonClimateService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it('falls back to the current weather provider when historical climate fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    });

    const weatherProvider = {
      getForecast: jest.fn().mockResolvedValue({
        current: {
          temperatureC: 31,
          humidityPercent: 68,
          rainfallExpectedMm: 14,
        },
        daily: [
          { maxTemperatureC: 35, minTemperatureC: 25, rainfallMm: 10 },
          { maxTemperatureC: 33, minTemperatureC: 24, rainfallMm: 4 },
        ],
      }),
    };

    const service = new SeasonClimateService(
      {
        get: jest
          .fn()
          .mockReturnValue('https://archive-api.example/v1/archive'),
      } as never,
      weatherProvider as never,
    );

    const result = await service.getSeasonClimate({
      state: 'Punjab',
      seasonProfile: {
        seasonKey: 'KHARIF',
        sowingMonth: 6,
      },
    });

    expect(result.method).toBe('CURRENT_FALLBACK');
    expect(result.averageTempC).toBe(31);
    expect(result.averageHumidityPercent).toBe(68);
    expect(result.totalRainfallMm).toBe(14);
    expect(result.minTempC).toBe(24);
    expect(result.maxTempC).toBe(35);
    expect(result.assumptions[0]).toContain('Punjab');
    expect(weatherProvider.getForecast).toHaveBeenCalledWith({
      latitude: 30.9008,
      longitude: 75.8573,
    });
  });
});
