/** @type {import('next').NextConfig} */
const { PHASE_PRODUCTION_BUILD } = require('next/constants');
const withBundleAnalyzer = process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

/**
 * @param {string} phase - Phase of the Next.js build process
 * @param {{defaultConfig: import('next').NextConfig}} options - Default Next.js config
 * @returns {import('next').NextConfig} - Final Next.js configuration
 */
module.exports = (phase, { defaultConfig }) => {
  const isProd = phase === PHASE_PRODUCTION_BUILD;
  
  // Common config for all environments
  const nextConfig = {
    // Disable automatic static optimization for problematic pages
    unstable_excludeFiles: [
      'app/dashboard/page.tsx',
      'app/dashboard/layout.tsx'
    ],
    // Output standalone for containerized deployment
    output: 'standalone',
    
    // React settings optimized for single-user development
    reactStrictMode: false,
    
    // Enable full Fast Refresh capabilities
    webpack: (config, { dev, isServer }) => {
      // Enhanced Fast Refresh for development
      if (dev) {
        config.optimization.moduleIds = 'named';
        config.optimization.chunkIds = 'named';
      }
      return config;
    },
    
    // Disable type checking and linting for deployment builds
    typescript: {
      ignoreBuildErrors: isProd,
      // tsconfigPath: isProd ? './tsconfig.prod.json' : './tsconfig.json',
    },
    
    eslint: {
      ignoreDuringBuilds: isProd,
    },
    
    // Image optimization
    images: {
      domains: ['dashboard.tradingfarm.com', 'vault.tradingfarm.com'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
      imageSizes: [16, 32, 48, 64, 96, 128, 256],
      formats: ['image/webp'],
    },
    
    // Support API routes and server components
    experimental: {
      // Speed up compilation
      turbotrace: {
        memoryLimit: 4000, // Enhanced memory limit for faster builds
      },
      // Improve development startup time
      swcMinify: true,
      serverActions: {
        allowedOrigins: isProd 
          ? ['dashboard.tradingfarm.com', 'vault.tradingfarm.com']
          : ['localhost:3000']
      },
      // Enable optimizations for production
      optimizeCss: false, // Disable CSS optimization to resolve build issues
      optimizePackageImports: isProd ? [
        'recharts', '@tremor/react', 'lucide-react', '@shadcn/ui', 
        'date-fns', 'react-resizable-panels'
      ] : [],
      // Just-in-time compilation for production
      turbotrace: isProd ? {
        memoryLimit: 4096, // Adjust based on available memory
      } : undefined,
    },
    
    // Optimize build
    poweredByHeader: false,
    compress: true,
    
    // Production specific optimizations
    productionBrowserSourceMaps: false,
    
    // Increase build performance
    swcMinify: true,
    
    // Configure webpack for additional optimizations
    webpack: (config, { isServer }) => {
      // Optimize SVG loading
      config.module.rules.push({
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      });
      
      // Add production-only optimizations
      if (isProd && !isServer) {
        // Split chunks for better caching
        config.optimization.splitChunks = {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            defaultVendors: {
              test: /[\\]node_modules[\\]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        };
      }
      
      return config;
    },
  };
  
  return withBundleAnalyzer(nextConfig);
};
