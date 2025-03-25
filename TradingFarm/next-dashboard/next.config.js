/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable in development to prevent duplicate effects
  experimental: {
    serverComponentsExternalPackages: [
      '@pinecone-database/pinecone',
      'pg'
    ]
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'images.unsplash.com'],
  },
  env: {
    NEXT_PUBLIC_SOCKET_URL: 'http://localhost:3001',
  },
};

module.exports = nextConfig;
