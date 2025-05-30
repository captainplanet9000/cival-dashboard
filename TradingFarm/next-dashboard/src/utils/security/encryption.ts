/**
 * Encryption utilities for protecting sensitive data
 * These utilities use browser-native WebCrypto API for secure cryptographic operations
 */

// Constants
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes
const ITERATION_COUNT = 100000;

/**
 * Generate a cryptographic key from a password
 * Uses PBKDF2 to derive a key from a password and salt
 * 
 * @param password The user password to derive key from
 * @param salt Random salt for key derivation (must be saved for decryption)
 * @returns A CryptoKey that can be used for encryption/decryption
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Convert password to key material
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import as raw key material
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Derive the actual encryption key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATION_COUNT,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random bytes for salt or initialization vector
 * 
 * @param length Number of bytes to generate
 * @returns Random bytes as Uint8Array
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Encrypt sensitive data with a password
 * 
 * @param data String data to encrypt
 * @param password Password to encrypt with
 * @returns Encrypted data object with all components needed for decryption
 */
export async function encryptData(data: string, password: string): Promise<{
  encrypted: string;
  salt: string;
  iv: string;
}> {
  // Generate random salt and initialization vector
  const salt = generateRandomBytes(SALT_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);
  
  // Derive encryption key from password and salt
  const key = await deriveKey(password, salt);
  
  // Encode data to encrypt
  const encoder = new TextEncoder();
  const dataToEncrypt = encoder.encode(data);
  
  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
    },
    key,
    dataToEncrypt
  );
  
  // Convert binary data to Base64 strings for storage
  return {
    encrypted: bufferToBase64(encryptedBuffer),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt encrypted data with a password
 * 
 * @param encryptedData Object containing encrypted data and parameters
 * @param password Password to decrypt with
 * @returns Decrypted string data
 */
export async function decryptData(
  encryptedData: {
    encrypted: string;
    salt: string;
    iv: string;
  },
  password: string
): Promise<string> {
  // Convert Base64 strings back to binary data
  const encryptedBuffer = base64ToBuffer(encryptedData.encrypted);
  const salt = base64ToBuffer(encryptedData.salt);
  const iv = base64ToBuffer(encryptedData.iv);
  
  // Derive decryption key from password and salt
  const key = await deriveKey(password, salt);
  
  try {
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      encryptedBuffer
    );
    
    // Decode the decrypted data to a string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('Decryption failed. This could be due to an incorrect password.');
  }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  const binString = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  return btoa(binString);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binString = atob(base64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a secure random password
 * 
 * @param length Length of the password to generate
 * @returns A secure random password
 */
export function generateSecurePassword(length = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  
  // Use cryptographically secure random values
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  
  return password;
}

/**
 * Hash a password for secure storage (one-way)
 * 
 * @param password Password to hash
 * @returns Hashed password as Base64 string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return bufferToBase64(hash);
}

/**
 * Securely store API keys in browser's localStorage
 * This encrypts the API key with a master password
 * 
 * @param serviceName Name of the service (e.g., 'binance')
 * @param apiKey API key to store
 * @param apiSecret API secret to store
 * @param masterPassword Master password for encryption
 */
export async function storeApiCredentials(
  serviceName: string,
  apiKey: string,
  apiSecret: string,
  masterPassword: string
): Promise<void> {
  const credentials = JSON.stringify({
    apiKey,
    apiSecret,
    timestamp: Date.now(),
  });
  
  const encrypted = await encryptData(credentials, masterPassword);
  
  // Store encrypted credentials
  localStorage.setItem(`trading-farm:${serviceName}:credentials`, JSON.stringify(encrypted));
}

/**
 * Retrieve API credentials from secured storage
 * 
 * @param serviceName Name of the service (e.g., 'binance')
 * @param masterPassword Master password for decryption
 * @returns Decrypted API credentials
 */
export async function getApiCredentials(
  serviceName: string,
  masterPassword: string
): Promise<{ apiKey: string; apiSecret: string; timestamp: number } | null> {
  const storedData = localStorage.getItem(`trading-farm:${serviceName}:credentials`);
  
  if (!storedData) {
    return null;
  }
  
  try {
    const encrypted = JSON.parse(storedData);
    const decrypted = await decryptData(encrypted, masterPassword);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt API credentials:', error);
    return null;
  }
}
