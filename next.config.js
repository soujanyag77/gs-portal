/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Support larger uploads for videos/interactive bundles if needed
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
