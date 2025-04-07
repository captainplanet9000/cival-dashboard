/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  basePath: '',
  swcMinify: true,
}

module.exports = nextConfig 