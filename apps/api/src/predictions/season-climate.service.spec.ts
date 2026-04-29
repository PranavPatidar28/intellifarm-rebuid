import {
  SeasonClimateService,
  aggregateHistoricalClimateSamples,
} from './season-climate.service';

describe('aggregateHistoricalClimateSamples', () => {
  it('averages and rounds multiple historical samples', () => {
    const result = aggregateHistoricalClimateSamples([
      {
        averageTempC: 28.14,
        averageHumidityPercent: 66.41,
        totalRainfallMm: 102.12,
      },
      {
        averageTempC: 30.62,
        averageHumidityPercent: 70.18,
        totalRainfallMm: 88.44,
      },
    ]);

    expect(result).toEqual({
      averageTempC: 29.4,
      averageHumidityPercent: 68.3,
      totalRainfallMm: 95.3,
    });
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
    expect(result.assumptions[0]).toContain('Punjab');
    expect(weatherProvider.getForecast).toHaveBeenCalledWith({
      latitude: 30.9008,
      longitude: 75.8573,
    });
  });
});
