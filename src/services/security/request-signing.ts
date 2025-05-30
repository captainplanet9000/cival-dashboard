/**
 * Request signing utilities for secure API communications
 * Implements industry standard signing methods for various services
 */

import { createHmac, createHash } from 'crypto';

/**
 * Request signing configuration
 */
export interface SigningConfig {
  key: string;
  secret: string;
  passphrase?: string;
  additionalParameters?: Record<string, string>;
  algorithm?: 'hmac-sha256' | 'hmac-sha512';
  includeBody?: boolean;
  signatureVersion?: 1 | 2;
  timestampFormat?: 'seconds' | 'milliseconds';
}

/**
 * Request to be signed
 */
export interface RequestToSign {
  method: string;
  path: string;
  body?: any;
  queryParams?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  timestamp?: number;
}

/**
 * Signed request result
 */
export interface SignedRequest {
  headers: Record<string, string>;
  queryParams?: Record<string, string | string[]>;
  signature: string;
  timestamp: number;
}

/**
 * Utility for signing API requests
 * Supports multiple signing methods for different exchanges and services
 */
export class RequestSigner {
  /**
   * Sign a request for Bybit API
   * 
   * @param config Signing configuration
   * @param request Request details to sign
   * @returns Signed request headers and query parameters
   */
  public static signBybit(
    config: SigningConfig, 
    request: RequestToSign
  ): SignedRequest {
    const timestamp = request.timestamp || Date.now();
    const { key, secret } = config;
    
    // Prepare query params
    const queryParams = { 
      ...request.queryParams,
      api_key: key,
      timestamp: timestamp.toString()
    };
    
    // Create sorted query string
    const queryString = Object.entries(queryParams)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    // Create string to sign
    let signString = queryString;
    
    // Include request body if configured
    if (config.includeBody && request.body) {
      signString += JSON.stringify(request.body);
    }
    
    // Create signature
    const hmac = createHmac('sha256', secret);
    const signature = hmac.update(signString).digest('hex');
    
    return {
      headers: {
        ...request.headers || {},
      },
      queryParams: {
        ...queryParams,
        sign: signature
      },
      signature,
      timestamp
    };
  }
  
  /**
   * Sign a request for Coinbase API
   * 
   * @param config Signing configuration
   * @param request Request details to sign
   * @returns Signed request headers
   */
  public static signCoinbase(
    config: SigningConfig, 
    request: RequestToSign
  ): SignedRequest {
    const timestamp = Math.floor((request.timestamp || Date.now()) / 1000);
    const { key, secret, passphrase } = config;
    
    if (!passphrase) {
      throw new Error('Passphrase is required for Coinbase signing');
    }
    
    // Build request path with query params
    let path = request.path;
    if (request.queryParams) {
      const queryString = Object.entries(request.queryParams)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}=${value.join(',')}`;
          }
          return `${key}=${value}`;
        })
        .join('&');
      
      if (queryString) {
        path = `${path}?${queryString}`;
      }
    }
    
    // Create string to sign
    const bodyString = request.body ? JSON.stringify(request.body) : '';
    const message = `${timestamp}${request.method}${path}${bodyString}`;
    
    // Decode secret (Base64)
    const secretDecoded = Buffer.from(secret, 'base64');
    
    // Create signature
    const hmac = createHmac('sha256', secretDecoded);
    const signature = hmac.update(message).digest('base64');
    
    return {
      headers: {
        ...request.headers || {},
        'CB-ACCESS-KEY': key,
        'CB-ACCESS-SIGN': signature,
        'CB-ACCESS-TIMESTAMP': timestamp.toString(),
        'CB-ACCESS-PASSPHRASE': passphrase
      },
      queryParams: request.queryParams,
      signature,
      timestamp
    };
  }
  
  /**
   * Sign a request for Binance API
   * 
   * @param config Signing configuration
   * @param request Request details to sign
   * @returns Signed request headers and query parameters
   */
  public static signBinance(
    config: SigningConfig, 
    request: RequestToSign
  ): SignedRequest {
    const timestamp = request.timestamp || Date.now();
    const { key, secret } = config;
    
    // Prepare query params
    const queryParams = { 
      ...request.queryParams,
      timestamp: timestamp.toString()
    };
    
    // Create query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}=${value.join(',')}`;
        }
        return `${key}=${value}`;
      })
      .join('&');
    
    // Create signature
    const hmac = createHmac('sha256', secret);
    const signature = hmac.update(queryString).digest('hex');
    
    return {
      headers: {
        ...request.headers || {},
        'X-MBX-APIKEY': key
      },
      queryParams: {
        ...queryParams,
        signature
      },
      signature,
      timestamp
    };
  }
  
  /**
   * Sign a request for API with JWT
   * 
   * @param token JWT token
   * @returns Signed request headers
   */
  public static signWithJwt(token: string): SignedRequest {
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signature: '',
      timestamp: Date.now()
    };
  }
  
  /**
   * Sign arbitrary data with HMAC
   * 
   * @param data Data to sign
   * @param secret Secret key
   * @param algorithm Hashing algorithm
   * @returns Signature
   */
  public static signData(
    data: string, 
    secret: string, 
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): string {
    const hmac = createHmac(algorithm, secret);
    return hmac.update(data).digest('hex');
  }
  
  /**
   * Generate a nonce value
   * 
   * @returns Nonce string
   */
  public static generateNonce(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Create SHA-256 hash of data
   * 
   * @param data Data to hash
   * @returns Hex hash
   */
  public static sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
} 