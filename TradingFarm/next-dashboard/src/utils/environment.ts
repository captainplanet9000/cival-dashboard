/**
 * Environment Utility for the Trading Farm Dashboard
 * 
 * Provides environment-specific configurations and helpers.
 */

// Environment detection
export const Env = {
  /**
   * Is this a development environment?
   */
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  },

  /**
   * Is this a production environment?
   */
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },

  /**
   * Is this a test environment?
   */
  get isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  },

  /**
   * Get current environment name
   */
  get name(): 'development' | 'production' | 'test' {
    return process.env.NODE_ENV as 'development' | 'production' | 'test';
  },
  
  /**
   * Get a public environment variable
   * 
   * Only returns variables that start with NEXT_PUBLIC_
   */
  getPublicVar(name: string, defaultValue: string = ''): string {
    const key = name.startsWith('NEXT_PUBLIC_') 
      ? name 
      : `NEXT_PUBLIC_${name}`;
      
    return (typeof process !== 'undefined' && process.env && process.env[key]) || defaultValue;
  },
  
  /**
   * Safely check if a feature flag is enabled
   */
  isFeatureEnabled(flagName: string): boolean {
    const flag = this.getPublicVar(`FEATURE_${flagName}`);
    return flag === 'true' || flag === '1';
  },
  
  /**
   * Get log level based on environment
   */
  get logLevel(): 'debug' | 'info' | 'warn' | 'error' {
    if (this.isDevelopment) return 'debug';
    
    const configuredLevel = this.getPublicVar('LOG_LEVEL');
    
    switch(configuredLevel.toLowerCase()) {
      case 'debug': return 'debug';
      case 'info': return 'info';
      case 'warn': return 'warn';
      case 'error': return 'error';
      default: return this.isProduction ? 'warn' : 'info';
    }
  },
  
  /**
   * Should performance monitoring be enabled?
   */
  get enablePerformanceMonitoring(): boolean {
    return this.isDevelopment || this.isFeatureEnabled('PERFORMANCE_MONITORING');
  },
  
  /**
   * Get API base URL
   */
  get apiBaseUrl(): string {
    return this.getPublicVar('API_URL', '/api');
  },
  
  /**
   * Get WebSocket URL
   */
  get wsUrl(): string {
    return this.getPublicVar('WS_URL', '');
  }
};
