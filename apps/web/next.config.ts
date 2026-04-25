import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@intellifarm/contracts'],
};

export default nextConfig;
