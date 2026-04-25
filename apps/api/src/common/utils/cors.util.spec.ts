import {
  isCorsOriginAllowed,
  resolveAllowedCorsOrigins,
} from './cors.util';

describe('resolveAllowedCorsOrigins', () => {
  it('uses APP_URLS when provided', () => {
    expect(
      resolveAllowedCorsOrigins({
        appUrls: 'https://app.example.com, https://preview.example.com ',
        appUrl: 'https://fallback.example.com',
        nodeEnv: 'production',
      }),
    ).toEqual([
      'https://app.example.com',
      'https://preview.example.com',
    ]);
  });

  it('falls back to APP_URL when APP_URLS is not provided', () => {
    expect(
      resolveAllowedCorsOrigins({
        appUrl: 'https://app.example.com',
        nodeEnv: 'production',
      }),
    ).toEqual(['https://app.example.com']);
  });

  it('always includes localhost 3000 and 3001 in development', () => {
    expect(
      resolveAllowedCorsOrigins({
        appUrl: 'https://app.example.com',
        nodeEnv: 'development',
      }),
    ).toEqual([
      'https://app.example.com',
      'http://localhost:3000',
      'http://localhost:3001',
    ]);
  });
});

describe('isCorsOriginAllowed', () => {
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://localhost:3001',
  ]);

  it('allows requests with no origin header', () => {
    expect(isCorsOriginAllowed(undefined, allowedOrigins)).toBe(true);
  });

  it('allows configured origins', () => {
    expect(
      isCorsOriginAllowed('http://localhost:3001', allowedOrigins),
    ).toBe(true);
  });

  it('rejects unrelated origins', () => {
    expect(
      isCorsOriginAllowed('https://malicious.example.com', allowedOrigins),
    ).toBe(false);
  });
});
