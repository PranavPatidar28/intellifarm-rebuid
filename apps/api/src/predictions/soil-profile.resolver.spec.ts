import { resolveSoilProfile } from './soil-profile.resolver';

describe('resolveSoilProfile', () => {
  it('uses exact advanced metrics with high confidence', () => {
    const result = resolveSoilProfile({
      soilMetrics: {
        n: 52,
        p: 34,
        k: 61,
        ph: 6.7,
      },
      soilType: 'RED',
    });

    expect(result.source).toBe('ADVANCED_METRICS');
    expect(result.inputConfidence).toBe('HIGH');
    expect(result.soilMetrics).toEqual({
      n: 52,
      p: 34,
      k: 61,
      ph: 6.7,
    });
    expect(result.summary).toContain('exact advanced soil values');
  });

  it('uses the selected soil type proxy when manual metrics are not supplied', () => {
    const result = resolveSoilProfile({
      soilType: 'BLACK_REGUR',
    });

    expect(result.source).toBe('PAGE_SOIL_TYPE');
    expect(result.inputConfidence).toBe('MEDIUM');
    expect(result.soilType).toBe('BLACK_REGUR');
    expect(result.soilMetrics).toEqual({
      n: 40,
      p: 35,
      k: 85,
      ph: 7.8,
    });
    expect(result.summary).toContain('typical N/P/K ranges');
    expect(result.assumptions[0]).toContain('midpoint estimates');
  });

  it('falls back to a broad default profile when soil is unknown', () => {
    const result = resolveSoilProfile({});

    expect(result.source).toBe('UNKNOWN_DEFAULT');
    expect(result.inputConfidence).toBe('LOW');
    expect(result.soilType).toBeNull();
    expect(result.soilMetrics).toEqual({
      n: 38,
      p: 35,
      k: 50,
      ph: 6.8,
    });
    expect(result.assumptions[0]).toContain('midpoint estimate');
  });

  it('fills missing advanced metrics from the chosen proxy profile', () => {
    const result = resolveSoilProfile({
      soilType: 'LATERITE',
      soilMetrics: {
        n: 21,
        p: 14,
      },
    });

    expect(result.source).toBe('ADVANCED_METRICS');
    expect(result.inputConfidence).toBe('MEDIUM');
    expect(result.soilMetrics).toEqual({
      n: 21,
      p: 14,
      k: 40,
      ph: 5.6,
    });
    expect(result.summary).toContain('range-based nutrient fallbacks');
    expect(result.assumptions[0]).toContain('laterite');
  });
});
