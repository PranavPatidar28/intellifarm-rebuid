const DEV_LOCALHOST_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
] as const;

type ResolveAllowedCorsOriginsInput = {
  appUrls?: string | null;
  appUrl?: string | null;
  nodeEnv?: string | null;
};

export function resolveAllowedCorsOrigins({
  appUrls,
  appUrl,
  nodeEnv,
}: ResolveAllowedCorsOriginsInput) {
  const allowedOrigins = new Set<string>();

  if (appUrls?.trim()) {
    appUrls
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => allowedOrigins.add(origin));
  } else if (appUrl?.trim()) {
    allowedOrigins.add(appUrl.trim());
  }

  if ((nodeEnv ?? 'development') === 'development') {
    DEV_LOCALHOST_ORIGINS.forEach((origin) => allowedOrigins.add(origin));
  }

  return [...allowedOrigins];
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins: Iterable<string>,
) {
  if (!origin) {
    return true;
  }

  const allowedOriginSet =
    allowedOrigins instanceof Set ? allowedOrigins : new Set(allowedOrigins);

  return allowedOriginSet.has(origin);
}
