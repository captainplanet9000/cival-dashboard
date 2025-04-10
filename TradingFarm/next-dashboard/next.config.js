/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Using image optimization with domains we need
  images: {
    domains: [
      'images.unsplash.com',
      'avatars.githubusercontent.com',
      'github.com',
      'lh3.googleusercontent.com',
      'platform-lookaside.fbsbx.com',
    ],
  },
  // Configure webpack
  webpack: (config, { isServer }) => {
    // Add support for importing SVGs as React components
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
};

module.exports = nextConfig;
