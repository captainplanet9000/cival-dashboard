/**
 * Trading Farm Dashboard Deployment Configuration
 * 
 * This file contains environment-specific configurations for different deployment targets.
 */

const environments = {
  development: {
    name: 'Development',
    url: 'http://localhost:3000',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    webSocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080',
    enableMockData: true,
    logLevel: 'debug',
    securitySettings: {
      enableCSP: true,
      enableHSTS: false,
      forceHttps: false,
    }
  },
  
  staging: {
    name: 'Staging',
    url: 'https://staging.tradingfarm.app',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api-staging.tradingfarm.app',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    webSocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://ws-staging.tradingfarm.app',
    enableMockData: false,
    logLevel: 'info',
    securitySettings: {
      enableCSP: true,
      enableHSTS: true,
      forceHttps: true,
    }
  },
  
  production: {
    name: 'Production',
    url: 'https://tradingfarm.app',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.tradingfarm.app',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    webSocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://ws.tradingfarm.app',
    enableMockData: false,
    logLevel: 'error',
    securitySettings: {
      enableCSP: true,
      enableHSTS: true,
      forceHttps: true,
    }
  }
};

// Configuration for CDN and asset optimization
const cdnConfig = {
  enabled: process.env.USE_CDN === 'true',
  provider: process.env.CDN_PROVIDER || 'cloudfront',
  baseUrl: process.env.CDN_BASE_URL || '',
  imageOptimization: true,
  cacheMaxAge: 60 * 60 * 24 * 7, // 7 days in seconds
};

// Performance optimization settings
const performanceConfig = {
  compression: true,
  minification: true,
  imageOptimization: true,
  lazyLoading: true,
  prefetching: true,
  caching: {
    browser: {
      maxAge: 60 * 60, // 1 hour in seconds
      staleWhileRevalidate: 60 * 60 * 24, // 1 day in seconds
    },
    cdn: {
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    },
    api: {
      maxAge: 60, // 1 minute in seconds
    }
  }
};

// Security configuration
const securityConfig = {
  csp: {
    enabled: true,
    reportOnly: process.env.NODE_ENV !== 'production',
    directives: {
      // Configured in src/utils/security/csp.ts
    }
  },
  featurePolicy: {
    enabled: true,
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
    }
  },
  authentication: {
    sessionDuration: 60 * 60 * 24 * 7, // 7 days in seconds
    requireEmailVerification: true,
    allowPasswordReset: true,
    mfaEnabled: true,
  }
};

// Monitoring and analytics configuration
const monitoringConfig = {
  errorTracking: {
    enabled: true,
    provider: process.env.ERROR_TRACKING_PROVIDER || 'sentry',
    dsn: process.env.ERROR_TRACKING_DSN || '',
    sampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 1.0,
  },
  analytics: {
    enabled: process.env.NODE_ENV === 'production',
    provider: process.env.ANALYTICS_PROVIDER || 'google-analytics',
    trackingId: process.env.ANALYTICS_TRACKING_ID || '',
    anonymizeIp: true,
  },
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    format: 'json',
    outputs: ['console', 'file'],
  }
};

// Deployment provider configuration
const deploymentConfig = {
  provider: process.env.DEPLOYMENT_PROVIDER || 'netlify',
  region: process.env.DEPLOYMENT_REGION || 'us-west-2',
  buildCommand: 'npm run build',
  outputDirectory: '.next',
  nodeVersion: '20.x',
  environmentVariables: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_WEBSOCKET_URL',
    'ERROR_TRACKING_DSN',
    'ANALYTICS_TRACKING_ID',
  ],
  serverRuntimes: {
    netlify: {
      functions: {
        directory: 'netlify/functions',
        nodeVersion: '20.x',
      }
    },
    vercel: {
      functions: {
        memory: 1024, // MB
        maxDuration: 10, // seconds
      }
    }
  }
};

// Get current environment from NODE_ENV
const getCurrentEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Map NODE_ENV to our environment configs
  if (nodeEnv === 'production') {
    return process.env.DEPLOYMENT_ENV === 'staging' 
      ? environments.staging 
      : environments.production;
  }
  
  return environments.development;
};

module.exports = {
  environments,
  getCurrentEnvironment,
  cdnConfig,
  performanceConfig,
  securityConfig,
  monitoringConfig,
  deploymentConfig,
};
