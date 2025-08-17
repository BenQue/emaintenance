import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@emaintenance/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3002',
        pathname: '/api/work-orders/**',
      },
      {
        protocol: 'https',
        hostname: '*.emaintenance.com',
        pathname: '/api/work-orders/**',
      },
    ],
  },
};

export default nextConfig;