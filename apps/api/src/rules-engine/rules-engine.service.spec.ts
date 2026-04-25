import { RulesEngineService } from './rules-engine.service';

describe('RulesEngineService', () => {
  const service = new RulesEngineService(
    {} as never,
    {
      publishInternalEvent: jest.fn(),
    } as never,
    {} as never,
  );

  it('computes the correct stage from sowing date windows', () => {
    const now = new Date();
    const sowingDate = new Date(now);
    sowingDate.setDate(now.getDate() - 70);

    const stage = service.computeStage(
      {
        id: 'crop-1',
        slug: 'wheat',
        nameEn: 'Wheat',
        nameHi: 'गेहूं',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        stageRules: [
          { labelEn: 'Establishment', startDay: 0, endDay: 14 },
          { labelEn: 'Tillering', startDay: 15, endDay: 49 },
          { labelEn: 'Flowering', startDay: 50, endDay: 89 },
        ],
      },
      sowingDate,
    );

    expect(stage).toBe('Flowering');
  });

  it('builds dry-weather advisories for heat stress', () => {
    const advisories = service.buildWeatherAdvisories({
      weather: {
        currentTemperatureC: 36,
        rainfallExpectedMm: 1,
        forecastSummary: 'Hot and dry',
      },
      cropName: 'Cotton',
      currentStage: 'Flowering',
      irrigationType: 'RAIN_FED',
    });

    expect(advisories.join(' ')).toContain('Hot and dry');
    expect(advisories.join(' ')).toContain('Monitor soil moisture');
  });
});
