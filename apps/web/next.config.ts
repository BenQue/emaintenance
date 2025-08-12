import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@emaintanance/ui'],
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
        hostname: '*.emaintanance.com',
        pathname: '/api/work-orders/**',
      },
    ],
  },
};

export default nextConfig;