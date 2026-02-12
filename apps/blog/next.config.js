/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
