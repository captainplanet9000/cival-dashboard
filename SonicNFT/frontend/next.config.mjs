/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'ipfs.io',
      'cloudflare-ipfs.com',
      'gateway.pinata.cloud',
      'gateway.ipfs.io',
      'dweb.link',
      'ipfs.fleek.co',
      'ipfs.infura.io',
      'images.unsplash.com',
    ],
  },
  // For Docker deployment
  output: 'standalone',
};

export default nextConfig; 