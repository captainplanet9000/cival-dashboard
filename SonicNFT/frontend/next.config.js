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
    ],
  },
  // For Docker deployment
  output: 'standalone',
  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Add IPFS gateway domains to security policy
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self'; img-src 'self' data: https://*.ipfs.io https://*.pinata.cloud https://*.cloudflare-ipfs.com https://*.ipfs.dweb.link https://*.fleek.co https://*.infura.io;`,
          },
        ],
      },
    ];
  },
  // Redirects
  async redirects() {
    return [
      {
        source: '/nft/:id',
        destination: '/gallery?tokenId=:id',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig; 