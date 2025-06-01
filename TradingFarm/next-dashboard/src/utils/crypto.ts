import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Utility for securely encrypting and decrypting sensitive data like API keys
 * Uses AES-256-GCM for authenticated encryption
 */

// Use a server-side secret from .env
const SECRET_KEY = process.env.ENCRYPTION_SECRET!;
const ALGORITHM = 'aes-256-gcm';

// Validate encryption secret
if (!SECRET_KEY) {
  throw new Error('ENCRYPTION_SECRET environment variable must be set');
}

if (SECRET_KEY.length !== 32) {
  console.warn('ENCRYPTION_SECRET should be exactly 32 characters for optimal security');
}

/**
 * Encrypt text using AES-256-GCM
 * @param text Plain text to encrypt
 * @returns Object containing encrypted data, initialization vector, and authentication tag
 */
export function encrypt(text: string): { encryptedData: string; iv: string; authTag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}

/**
 * Decrypt previously encrypted text
 * @param encryptedData Encrypted data in hex format
 * @param iv Initialization vector in hex format
 * @param authTag Authentication tag in hex format
 * @returns Decrypted text
 */
export function decrypt(encryptedData: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(SECRET_KEY),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt API credentials for storage in the database
 * @param apiKey API key to encrypt
 * @param apiSecret API secret to encrypt
 * @returns Object containing encrypted API key and secret data
 */
export function encryptApiCredentials(apiKey: string, apiSecret: string): {
  apiKeyData: any;
  apiSecretData: any;
} {
  const apiKeyEncrypted = encrypt(apiKey);
  const apiSecretEncrypted = encrypt(apiSecret);
  
  return {
    apiKeyData: apiKeyEncrypted,
    apiSecretData: apiSecretEncrypted
  };
}

/**
 * Decrypt API credentials for use with exchange APIs
 * @param apiKeyData Encrypted API key data
 * @param apiSecretData Encrypted API secret data
 * @returns Object containing decrypted API key and secret
 */
export function decryptApiCredentials(
  apiKeyData: { encryptedData: string; iv: string; authTag: string },
  apiSecretData: { encryptedData: string; iv: string; authTag: string }
): {
  apiKey: string;
  apiSecret: string;
} {
  return {
    apiKey: decrypt(
      apiKeyData.encryptedData,
      apiKeyData.iv,
      apiKeyData.authTag
    ),
    apiSecret: decrypt(
      apiSecretData.encryptedData,
      apiSecretData.iv,
      apiSecretData.authTag
    )
  };
}
