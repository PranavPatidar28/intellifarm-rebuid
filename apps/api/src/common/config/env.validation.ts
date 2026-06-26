import { z } from 'zod';

/**
 * Startup environment validation.
 *
 * Critical secrets (JWT, database) are required so the app fails fast with a
 * clear message instead of throwing an opaque runtime error on first use.
 * Provider/feature vars are optional — the app runs on mock/seeded providers
 * by default (see .env.example).
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Required — the app cannot operate securely without these.
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),

  // Optional — clients/CORS.
  APP_URL: z.string().url().optional(),
  APP_URLS: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Copy .env.example to .env and fill in the required values.',
    );
  }

  // Merge the validated/coerced values back over the raw env so that
  // ConfigService still exposes every other (optional) variable. Returning
  // only parsed.data would silently drop provider keys, CORS settings, etc.
  return { ...config, ...parsed.data };
}
