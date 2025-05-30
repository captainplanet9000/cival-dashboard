/**
 * Tests for encryption utilities
 */

import { 
  encryptData, 
  decryptData, 
  generateSecurePassword,
  hashPassword,
  storeApiCredentials,
  getApiCredentials
} from './encryption';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key]),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Encryption Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('encryptData and decryptData', () => {
    it('should encrypt and decrypt data correctly with the same password', async () => {
      const testData = 'Sensitive trading information';
      const password = 'test-password-123';
      
      // Encrypt the data
      const encrypted = await encryptData(testData, password);
      
      // Verify encryption happened (data should be different)
      expect(encrypted.encrypted).not.toEqual(testData);
      expect(encrypted.salt).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      
      // Decrypt the data
      const decrypted = await decryptData(encrypted, password);
      
      // Verify decryption worked
      expect(decrypted).toEqual(testData);
    });
    
    it('should fail to decrypt with the wrong password', async () => {
      const testData = 'Sensitive trading information';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      // Encrypt with correct password
      const encrypted = await encryptData(testData, correctPassword);
      
      // Try to decrypt with wrong password
      await expect(decryptData(encrypted, wrongPassword))
        .rejects
        .toThrow('Decryption failed');
    });
  });
  
  describe('generateSecurePassword', () => {
    it('should generate a password of the correct length', () => {
      const password = generateSecurePassword(20);
      expect(password.length).toBe(20);
    });
    
    it('should generate different passwords each time', () => {
      const passwords = new Set();
      for (let i = 0; i < 10; i++) {
        passwords.add(generateSecurePassword());
      }
      // All 10 passwords should be unique
      expect(passwords.size).toBe(10);
    });
    
    it('should use the default length if none specified', () => {
      const password = generateSecurePassword();
      expect(password.length).toBe(16); // Default length
    });
  });
  
  describe('hashPassword', () => {
    it('should generate a hash for a password', async () => {
      const password = 'my-secure-password';
      const hash = await hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      // Hash should be different from the original password
      expect(hash).not.toEqual(password);
    });
    
    it('should generate the same hash for the same password', async () => {
      const password = 'my-secure-password';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).toEqual(hash2);
    });
    
    it('should generate different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');
      
      expect(hash1).not.toEqual(hash2);
    });
  });
  
  describe('API credential storage', () => {
    it('should store and retrieve API credentials', async () => {
      const serviceName = 'binance';
      const apiKey = 'test-api-key';
      const apiSecret = 'test-api-secret';
      const masterPassword = 'master-password';
      
      // Store the credentials
      await storeApiCredentials(
        serviceName,
        apiKey,
        apiSecret,
        masterPassword
      );
      
      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `trading-farm:${serviceName}:credentials`,
        expect.any(String)
      );
      
      // Retrieve the credentials
      const retrieved = await getApiCredentials(
        serviceName,
        masterPassword
      );
      
      // Verify the retrieved data
      expect(retrieved).not.toBeNull();
      expect(retrieved?.apiKey).toEqual(apiKey);
      expect(retrieved?.apiSecret).toEqual(apiSecret);
      expect(retrieved?.timestamp).toBeDefined();
    });
    
    it('should fail to retrieve with wrong master password', async () => {
      const serviceName = 'binance';
      const apiKey = 'test-api-key';
      const apiSecret = 'test-api-secret';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      // Store with correct password
      await storeApiCredentials(
        serviceName,
        apiKey,
        apiSecret,
        correctPassword
      );
      
      // Try to retrieve with wrong password
      const retrieved = await getApiCredentials(
        serviceName,
        wrongPassword
      );
      
      // Should return null on error
      expect(retrieved).toBeNull();
    });
    
    it('should return null for non-existent service', async () => {
      const nonExistentService = 'non-existent-service';
      const masterPassword = 'master-password';
      
      const retrieved = await getApiCredentials(
        nonExistentService,
        masterPassword
      );
      
      expect(retrieved).toBeNull();
    });
  });
});
