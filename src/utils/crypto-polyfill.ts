/**
 * Crypto API Polyfill
 * 
 * Provides fallback implementations for crypto functions in environments
 * where they are not natively supported.
 */

import { MonitoringService } from '../services/monitoring-service';
import * as CryptoJS from 'crypto-js';

// Feature detection for crypto APIs
export const cryptoFeatures = {
  // Check if crypto is available
  hasCrypto: typeof window !== 'undefined' && (
    typeof window.crypto !== 'undefined' || 
    // @ts-ignore - IE11 support
    typeof window.msCrypto !== 'undefined'
  ),
  
  // Check if subtle crypto is available
  hasSubtleCrypto: typeof window !== 'undefined' && (
    (typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined') ||
    // @ts-ignore - IE11 support
    (typeof window.msCrypto !== 'undefined' && typeof window.msCrypto.subtle !== 'undefined')
  ),
  
  // Check for specific algorithms
  hasHmac: false,
  hasSha256: false,
  hasSha512: false
};

// Get the crypto object (cross-browser)
export function getCrypto(): Crypto {
  if (typeof window === 'undefined') {
    throw new Error('Crypto is not available in this environment');
  }
  
  // @ts-ignore - IE11 support
  return window.crypto || window.msCrypto;
}

// Get the subtle crypto object (cross-browser)
export function getSubtleCrypto(): SubtleCrypto {
  const crypto = getCrypto();
  
  if (!crypto.subtle) {
    throw new Error('SubtleCrypto is not available in this environment');
  }
  
  return crypto.subtle;
}

// Test for algorithm support
const testAlgorithmSupport = async (): Promise<void> => {
  if (!cryptoFeatures.hasSubtleCrypto) return;
  
  const subtle = getSubtleCrypto();
  
  // Test HMAC support
  try {
    await subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    cryptoFeatures.hasHmac = true;
  } catch (e) {
    cryptoFeatures.hasHmac = false;
  }
  
  // Test SHA-256 support
  try {
    await subtle.digest('SHA-256', new Uint8Array(32));
    cryptoFeatures.hasSha256 = true;
  } catch (e) {
    cryptoFeatures.hasSha256 = false;
  }
  
  // Test SHA-512 support
  try {
    await subtle.digest('SHA-512', new Uint8Array(32));
    cryptoFeatures.hasSha512 = true;
  } catch (e) {
    cryptoFeatures.hasSha512 = false;
  }
};

// Run algorithm support tests when the module is imported
if (typeof window !== 'undefined') {
  testAlgorithmSupport().catch(() => {
    // Silently fail in case of errors during testing
  });
}

/**
 * Generate a secure random string
 * 
 * @param length Length of the random string to generate
 * @returns Random string in hex format
 */
export async function getRandomString(length: number): Promise<string> {
  if (cryptoFeatures.hasCrypto) {
    try {
      const buffer = new Uint8Array(Math.ceil(length / 2));
      getCrypto().getRandomValues(buffer);
      return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, length);
    } catch (error) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Native random generation failed, falling back to polyfill',
        data: { error }
      });
    }
  }
  
  // Fallback to crypto-js
  const randomWords = CryptoJS.lib.WordArray.random(Math.ceil(length / 2));
  return randomWords.toString(CryptoJS.enc.Hex).slice(0, length);
}

/**
 * Create a SHA-256 hash of data
 * 
 * @param data Data to hash
 * @returns Hex hash
 */
export async function sha256(data: string): Promise<string> {
  // Use native implementation if available
  if (cryptoFeatures.hasSha256) {
    try {
      const subtle = getSubtleCrypto();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Native SHA-256 failed, falling back to polyfill',
        data: { error }
      });
    }
  }
  
  // Fallback to crypto-js
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

/**
 * Create a SHA-512 hash of data
 * 
 * @param data Data to hash
 * @returns Hex hash
 */
export async function sha512(data: string): Promise<string> {
  // Use native implementation if available
  if (cryptoFeatures.hasSha512) {
    try {
      const subtle = getSubtleCrypto();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await subtle.digest('SHA-512', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Native SHA-512 failed, falling back to polyfill',
        data: { error }
      });
    }
  }
  
  // Fallback to crypto-js
  return CryptoJS.SHA512(data).toString(CryptoJS.enc.Hex);
}

/**
 * Create an HMAC-SHA256 signature
 * 
 * @param data Data to sign
 * @param key Key to use for signing
 * @returns Hex signature
 */
export async function hmacSha256(data: string, key: string): Promise<string> {
  // Use native implementation if available
  if (cryptoFeatures.hasHmac && cryptoFeatures.hasSha256) {
    try {
      const subtle = getSubtleCrypto();
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      const dataBuffer = encoder.encode(data);
      
      // Import key
      const cryptoKey = await subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      // Sign data
      const signature = await subtle.sign('HMAC', cryptoKey, dataBuffer);
      const hashArray = Array.from(new Uint8Array(signature));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Native HMAC-SHA256 failed, falling back to polyfill',
        data: { error }
      });
    }
  }
  
  // Fallback to crypto-js
  return CryptoJS.HmacSHA256(data, key).toString(CryptoJS.enc.Hex);
}

/**
 * Create an HMAC-SHA512 signature
 * 
 * @param data Data to sign
 * @param key Key to use for signing
 * @returns Hex signature
 */
export async function hmacSha512(data: string, key: string): Promise<string> {
  // Use native implementation if available
  if (cryptoFeatures.hasHmac && cryptoFeatures.hasSha512) {
    try {
      const subtle = getSubtleCrypto();
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      const dataBuffer = encoder.encode(data);
      
      // Import key
      const cryptoKey = await subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
      );
      
      // Sign data
      const signature = await subtle.sign('HMAC', cryptoKey, dataBuffer);
      const hashArray = Array.from(new Uint8Array(signature));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Native HMAC-SHA512 failed, falling back to polyfill',
        data: { error }
      });
    }
  }
  
  // Fallback to crypto-js
  return CryptoJS.HmacSHA512(data, key).toString(CryptoJS.enc.Hex);
}

/**
 * Base64 encode data
 * 
 * @param data Data to encode
 * @returns Base64 encoded string
 */
export function base64Encode(data: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    try {
      return window.btoa(data);
    } catch (error) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Native base64 encoding failed, falling back to polyfill',
        data: { error }
      });
    }
  }
  
  // Fallback implementation
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  while (i < data.length) {
    const char1 = data.charCodeAt(i++);
    const char2 = i < data.length ? data.charCodeAt(i++) : 0;
    const char3 = i < data.length ? data.charCodeAt(i++) : 0;
    
    const enc1 = char1 >> 2;
    const enc2 = ((char1 & 3) << 4) | (char2 >> 4);
    
    // Use let instead of const for variables that might be reassigned
    let enc3 = ((char2 & 15) << 2) | (char3 >> 6);
    let enc4 = char3 & 63;
    
    if (isNaN(char2)) {
      enc3 = 64;
      enc4 = 64;
    } else if (isNaN(char3)) {
      enc4 = 64;
    }
    
    result += base64chars.charAt(enc1) + base64chars.charAt(enc2) +
              base64chars.charAt(enc3) + base64chars.charAt(enc4);
  }
  
  return result;
}

/**
 * Base64 decode data
 * 
 * @param data Data to decode
 * @returns Decoded string
 */
export function base64Decode(data: string): string {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    try {
      return window.atob(data);
    } catch (error) {
      MonitoringService.logEvent({
        type: 'warning',
        message: 'Native base64 decoding failed, falling back to polyfill',
        data: { error }
      });
    }
  }
  
  // Fallback implementation
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  // Remove non-base64 characters
  data = data.replace(/[^A-Za-z0-9+/=]/g, '');
  
  while (i < data.length) {
    const enc1 = base64chars.indexOf(data.charAt(i++));
    const enc2 = base64chars.indexOf(data.charAt(i++));
    const enc3 = base64chars.indexOf(data.charAt(i++));
    const enc4 = base64chars.indexOf(data.charAt(i++));
    
    const char1 = (enc1 << 2) | (enc2 >> 4);
    const char2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const char3 = ((enc3 & 3) << 6) | enc4;
    
    result += String.fromCharCode(char1);
    
    if (enc3 !== 64) {
      result += String.fromCharCode(char2);
    }
    
    if (enc4 !== 64) {
      result += String.fromCharCode(char3);
    }
  }
  
  return result;
}

// Export feature detection
export default {
  cryptoFeatures,
  getRandomString,
  sha256,
  sha512,
  hmacSha256,
  hmacSha512,
  base64Encode,
  base64Decode
}; 