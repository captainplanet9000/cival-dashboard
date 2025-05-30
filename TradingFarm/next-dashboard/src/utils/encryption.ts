/**
 * Encryption utilities for secure credential management
 * Implements industry-standard encryption for securing API keys and secrets
 */

// Import crypto module for server-side encryption
import crypto from 'crypto';

// Get encryption key from environment variable
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY;
const ENCRYPTION_IV_LENGTH = 16;

/**
 * Encrypt sensitive credential data
 * Uses AES-256-GCM encryption algorithm with random initialization vector for enhanced security
 * 
 * @param plaintext The credential to encrypt
 * @returns Encrypted credential as base64 string with IV prepended
 */
export async function encryptCredential(plaintext: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is not set');
  }
  
  try {
    // For Node.js environment
    if (typeof window === 'undefined') {
      return encryptNode(plaintext);
    }
    
    // For browser environment
    return await encryptBrowser(plaintext);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt credential');
  }
}

/**
 * Decrypt sensitive credential data
 * 
 * @param encryptedData The encrypted credential as base64 string with IV prepended
 * @returns Decrypted credential as plaintext
 */
export async function decryptCredential(encryptedData: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is not set');
  }
  
  try {
    // For Node.js environment
    if (typeof window === 'undefined') {
      return decryptNode(encryptedData);
    }
    
    // For browser environment
    return await decryptBrowser(encryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credential');
  }
}

/**
 * Node.js implementation of credential encryption
 */
function encryptNode(plaintext: string): string {
  // Create random initialization vector
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  
  // Create cipher using AES-256-GCM
  const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt the data
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine IV and auth tag with the encrypted data for storage
  // Format: iv.authTag.encryptedData
  return Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]).toString('base64');
}

/**
 * Node.js implementation of credential decryption
 */
function decryptNode(encryptedData: string): string {
  // Convert from base64 to buffer
  const buffer = Buffer.from(encryptedData, 'base64');
  
  // Extract IV, auth tag, and encrypted data
  const iv = buffer.slice(0, ENCRYPTION_IV_LENGTH);
  const authTag = buffer.slice(ENCRYPTION_IV_LENGTH, ENCRYPTION_IV_LENGTH + 16);
  const encrypted = buffer.slice(ENCRYPTION_IV_LENGTH + 16).toString('base64');
  
  // Create decipher
  const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  
  // Set auth tag
  decipher.setAuthTag(authTag);
  
  // Decrypt the data
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Browser implementation of credential encryption using Web Crypto API
 */
async function encryptBrowser(plaintext: string): Promise<string> {
  // Convert the encryption key to a CryptoKey
  const keyData = hexToBuffer(ENCRYPTION_KEY!);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(ENCRYPTION_IV_LENGTH));
  
  // Encrypt the data
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(plaintext);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    cryptoKey,
    dataBuffer
  );
  
  // Combine IV with encrypted data
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedBuffer), iv.length);
  
  // Convert to base64 string
  return arrayBufferToBase64(result);
}

/**
 * Browser implementation of credential decryption using Web Crypto API
 */
async function decryptBrowser(encryptedData: string): Promise<string> {
  // Convert from base64 to ArrayBuffer
  const data = base64ToArrayBuffer(encryptedData);
  
  // Extract IV and encrypted data
  const iv = data.slice(0, ENCRYPTION_IV_LENGTH);
  const encryptedBuffer = data.slice(ENCRYPTION_IV_LENGTH);
  
  // Convert the encryption key to a CryptoKey
  const keyData = hexToBuffer(ENCRYPTION_KEY!);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt the data
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    cryptoKey,
    encryptedBuffer
  );
  
  // Convert ArrayBuffer to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Helper function to convert hex string to ArrayBuffer
 */
function hexToBuffer(hexString: string): ArrayBuffer {
  const pairs = hexString.match(/[\da-f]{2}/gi) || [];
  const bytes = pairs.map(pair => parseInt(pair, 16));
  return new Uint8Array(bytes).buffer;
}

/**
 * Helper function to convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper function to convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
