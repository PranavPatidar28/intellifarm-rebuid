import { RailwayCropPredictionProvider } from './prediction-provider';

describe('RailwayCropPredictionProvider', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it('maps supported live crops into the local catalog and fills gaps from the mock provider', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          top_prediction: 'rice',
          confidence: 0.94,
          top_3_predictions: [
            {
              crop: 'rice',
              probability: 0.94,
              rag_evaluation:
                'Rice suits warm and wet conditions with stable field moisture.',
            },
            {
              crop: 'small onion',
              probability: 0.61,
              rag_evaluation: 'Unsupported crop for the current demo catalog.',
            },
          ],
        }),
    });

    const provider = new RailwayCropPredictionProvider(
      {
        get: jest
          .fn()
          .mockImplementation((key: string) =>
            key === 'PREDICTION_PROVIDER_URL'
              ? 'https://web-production-d1166.up.railway.app'
              : undefined,
          ),
      } as never,
      {
        predictCropSuggestions: jest.fn().mockResolvedValue([
          {
            cropName: 'Wheat',
            score: 0.7,
            rationale: 'Mock fallback for Wheat.',
          },
          {
            cropName: 'Cotton',
            score: 0.66,
            rationale: 'Mock fallback for Cotton.',
          },
          {
            cropName: 'Paddy',
            score: 0.62,
            rationale: 'Mock fallback for Paddy.',
          },
        ]),
        predictResources: jest.fn(),
      } as never,
    );

    const suggestions = await provider.predictCropSuggestions({
      farmPlot: {
        irrigationType: 'RAIN_FED',
        state: 'Punjab',
      },
      cropCatalog: [
        { slug: 'wheat', nameEn: 'Wheat' },
        { slug: 'paddy', nameEn: 'Paddy' },
        { slug: 'cotton', nameEn: 'Cotton' },
      ],
      weather: {
        currentTemperatureC: 27,
        humidityPercent: 72,
        rainfallExpectedMm: 14,
      },
      soilMetrics: {
        ph: 6.4,
      },
    });

    expect(suggestions.map((suggestion) => suggestion.cropName)).toEqual([
      'Paddy',
      'Wheat',
      'Cotton',
    ]);
    expect(suggestions[0]?.rationale).toContain('Mapped from live model label');
    expect(suggestions[0]?.rationale).toContain('Estimated N, P, and K');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://web-production-d1166.up.railway.app/predict',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('uses the mock provider for resource prediction requests', async () => {
    const predictResources = jest.fn().mockResolvedValue({
      cropName: 'Wheat',
      currentStage: 'Tillering',
      weeklyWaterMm: 32,
      fertilizerNeed: 'Medium top-up likely',
      pesticideNeedLevel: 'LOW',
      recommendations: ['Plan irrigation after checking field moisture.'],
      safetyNote: 'Confirm decisions locally.',
    });

    const provider = new RailwayCropPredictionProvider(
      {
        get: jest.fn(),
      } as never,
      {
        predictCropSuggestions: jest.fn(),
        predictResources,
      } as never,
    );

    const result = await provider.predictResources({
      cropSeason: {
        cropName: 'Wheat',
        currentStage: 'Tillering',
        irrigationType: 'DRIP',
      },
      weather: {
        currentTemperatureC: 29,
        humidityPercent: 64,
        rainfallExpectedMm: 3,
      },
    });

    expect(result.weeklyWaterMm).toBe(32);
    expect(predictResources).toHaveBeenCalledTimes(1);
  });
});
