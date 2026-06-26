import type { NextConfig } from 'next';
import { join } from 'node:path';

const nextConfig: NextConfig = {
  transpilePackages: ['@intellifarm/contracts'],
  // Emit a self-contained server bundle for Docker (.next/standalone).
  // outputFileTracingRoot points at the monorepo root so pnpm workspace
  // dependencies are traced correctly.
  output: 'standalone',
  outputFileTracingRoot: join(import.meta.dirname, '../../'),
};

export default nextConfig;
