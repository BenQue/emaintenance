/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
  // 保持原有配置
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
}

module.exports = nextConfig
