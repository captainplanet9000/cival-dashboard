/**
 * Persistent Cache Service
 * 
 * Provides persistent caching functionality using IndexedDB
 * with fallback to localStorage for offline support.
 */

import { MonitoringService } from '../monitoring-service';

// Cache entry with metadata
interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiry: number | null;
  tags: string[];
}

// Cache options
interface CacheOptions {
  // Database name
  dbName?: string;
  
  // Store name within the database
  storeName?: string;
  
  // Database version
  dbVersion?: number;
  
  // Default time-to-live in milliseconds (null = no expiry)
  defaultTTL?: number | null;
  
  // Maximum size of localStorage entries (in characters)
  maxLocalStorageSize?: number;
  
  // Whether to use localStorage as a fallback
  useLocalStorageBackup?: boolean;
}

const DEFAULT_OPTIONS: CacheOptions = {
  dbName: 'app-cache',
  storeName: 'cache-store',
  dbVersion: 1,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxLocalStorageSize: 1000000, // ~1MB
  useLocalStorageBackup: true
};

/**
 * Persistent cache service using IndexedDB with localStorage fallback
 */
export class PersistentCache {
  private static instance: PersistentCache;
  private db: IDBDatabase | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private options: CacheOptions;
  private localStoragePrefix = 'cache:';
  private localStorageMetaKey = 'cache:_meta';
  private dbSupported = false;
  private localStorageSupported = false;
  private pendingOperations: Array<() => Promise<void>> = [];
  
  private constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.detectFeatureSupport();
  }

  /**
   * Get the singleton instance of the cache service
   */
  public static getInstance(options?: CacheOptions): PersistentCache {
    if (!PersistentCache.instance) {
      PersistentCache.instance = new PersistentCache(options);
    } else if (options) {
      // Update options if provided
      PersistentCache.instance.options = { 
        ...PersistentCache.instance.options, 
        ...options 
      };
    }
    return PersistentCache.instance;
  }
  
  /**
   * Detect which storage features are supported
   */
  private detectFeatureSupport(): void {
    // Check IndexedDB support
    this.dbSupported = typeof window !== 'undefined' && 
      typeof window.indexedDB !== 'undefined';
    
    // Check localStorage support
    try {
      this.localStorageSupported = typeof window !== 'undefined' && 
        typeof window.localStorage !== 'undefined';
      
      if (this.localStorageSupported) {
        // Test localStorage to make sure it's actually working
        const testKey = '___cache_test___';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
      }
    } catch (e) {
      this.localStorageSupported = false;
    }
    
    if (!this.dbSupported && !this.localStorageSupported) {
      console.warn('PersistentCache: Neither IndexedDB nor localStorage is supported. Cache will not persist.');
    } else if (!this.dbSupported) {
      console.warn('PersistentCache: IndexedDB not supported. Falling back to localStorage (limited size).');
    }
  }

  /**
   * Initialize the cache database
   */
  public async init(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }
    
    if (this.isInitializing) {
      return this.initPromise;
    }
    
    this.isInitializing = true;
    
    this.initPromise = new Promise<void>((resolve, reject) => {
      if (!this.dbSupported) {
        // Skip DB initialization if not supported
        this.isInitializing = false;
        resolve();
        return;
      }
      
      const request = indexedDB.open(
        this.options.dbName!, 
        this.options.dbVersion!
      );
      
      request.onerror = (event) => {
        MonitoringService.logEvent({
          type: 'error',
          message: 'Failed to open IndexedDB',
          data: { error: (event.target as any).error }
        });
        this.isInitializing = false;
        resolve(); // Still resolve to allow falling back to localStorage
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitializing = false;
        
        // Run any pending operations
        const operations = [...this.pendingOperations];
        this.pendingOperations = [];
        
        Promise.all(operations.map(operation => operation()))
          .then(() => resolve())
          .catch((error) => {
            MonitoringService.logEvent({
              type: 'error',
              message: 'Error processing pending cache operations',
              data: { error }
            });
            resolve();
          });
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create or update object store
        if (!db.objectStoreNames.contains(this.options.storeName!)) {
          const store = db.createObjectStore(this.options.storeName!, { keyPath: 'key' });
          store.createIndex('expiry', 'expiry', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      };
    });
    
    return this.initPromise;
  }

  /**
   * Store a value in the cache with optional tags and TTL
   * 
   * @param key Cache key
   * @param data Data to cache
   * @param options.ttl Time-to-live in milliseconds
   * @param options.tags Tags to categorize the cache entry
   * @returns Promise resolving on completion
   */
  public async set<T>(
    key: string, 
    data: T, 
    options: { ttl?: number | null; tags?: string[] } = {}
  ): Promise<void> {
    if (!key) {
      throw new Error('Cache key is required');
    }
    
    // Initialize if needed
    if (!this.db && !this.isInitializing) {
      await this.init();
    } else if (this.isInitializing) {
      return new Promise<void>((resolve, reject) => {
        this.pendingOperations.push(async () => {
          try {
            await this.set(key, data, options);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    const timestamp = Date.now();
    const ttl = options.ttl !== undefined ? options.ttl : this.options.defaultTTL;
    const expiry = ttl === null ? null : timestamp + ttl;
    const tags = options.tags || [];
    
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp,
      expiry,
      tags
    };
    
    try {
      if (this.db) {
        // Store in IndexedDB
        await this.setInIndexedDB(entry);
      } else if (this.localStorageSupported && this.options.useLocalStorageBackup) {
        // Fallback to localStorage
        this.setInLocalStorage(entry);
      } else {
        // No storage available
        MonitoringService.logEvent({
          type: 'warning',
          message: 'Cache set failed - no storage available',
          data: { key }
        });
      }
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Cache set operation failed',
        data: { key, error }
      });
      
      // Try localStorage as last resort
      if (this.localStorageSupported && this.options.useLocalStorageBackup) {
        try {
          this.setInLocalStorage(entry);
        } catch (lsError) {
          // Give up
        }
      }
    }
  }

  /**
   * Retrieve a value from the cache
   * 
   * @param key Cache key
   * @returns Promise resolving to the cached data or null if not found or expired
   */
  public async get<T>(key: string): Promise<T | null> {
    if (!key) {
      throw new Error('Cache key is required');
    }
    
    // Initialize if needed
    if (!this.db && !this.isInitializing) {
      await this.init();
    } else if (this.isInitializing) {
      return new Promise<T | null>((resolve, reject) => {
        this.pendingOperations.push(async () => {
          try {
            const result = await this.get<T>(key);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    try {
      let entry: CacheEntry<T> | null = null;
      
      if (this.db) {
        // Try IndexedDB first
        entry = await this.getFromIndexedDB<T>(key);
      } 
      
      // Fall back to localStorage if needed
      if (!entry && this.localStorageSupported && this.options.useLocalStorageBackup) {
        entry = this.getFromLocalStorage<T>(key);
      }
      
      if (!entry) {
        return null; // Not found
      }
      
      // Check if expired
      if (entry.expiry !== null && entry.expiry < Date.now()) {
        // Expired - remove and return null
        this.remove(key).catch(() => {}); // Clean up in background
        return null;
      }
      
      return entry.data;
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Cache get operation failed',
        data: { key, error }
      });
      
      // Try localStorage as last resort
      if (this.localStorageSupported && this.options.useLocalStorageBackup) {
        try {
          const entry = this.getFromLocalStorage<T>(key);
          if (entry && (entry.expiry === null || entry.expiry >= Date.now())) {
            return entry.data;
          }
        } catch (lsError) {
          // Give up
        }
      }
      
      return null;
    }
  }

  /**
   * Remove a value from the cache
   * 
   * @param key Cache key
   * @returns Promise resolving on completion
   */
  public async remove(key: string): Promise<void> {
    if (!key) {
      throw new Error('Cache key is required');
    }
    
    // Initialize if needed
    if (!this.db && !this.isInitializing) {
      await this.init();
    } else if (this.isInitializing) {
      return new Promise<void>((resolve, reject) => {
        this.pendingOperations.push(async () => {
          try {
            await this.remove(key);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    try {
      if (this.db) {
        // Remove from IndexedDB
        await this.removeFromIndexedDB(key);
      }
      
      // Also remove from localStorage if used
      if (this.localStorageSupported) {
        this.removeFromLocalStorage(key);
      }
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Cache remove operation failed',
        data: { key, error }
      });
      
      // Try localStorage as backup
      if (this.localStorageSupported) {
        try {
          this.removeFromLocalStorage(key);
        } catch (lsError) {
          // Give up
        }
      }
    }
  }

  /**
   * Clear all values from the cache
   * 
   * @param options.olderThan Only clear entries older than this timestamp
   * @param options.tags Only clear entries with these tags
   * @returns Promise resolving on completion
   */
  public async clear(options: { olderThan?: number; tags?: string[] } = {}): Promise<void> {
    // Initialize if needed
    if (!this.db && !this.isInitializing) {
      await this.init();
    } else if (this.isInitializing) {
      return new Promise<void>((resolve, reject) => {
        this.pendingOperations.push(async () => {
          try {
            await this.clear(options);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    try {
      if (this.db) {
        // Clear IndexedDB with filters
        await this.clearIndexedDB(options);
      }
      
      // Also clear localStorage if used
      if (this.localStorageSupported) {
        this.clearLocalStorage(options);
      }
    } catch (error) {
      MonitoringService.logEvent({
        type: 'error',
        message: 'Cache clear operation failed',
        data: { options, error }
      });
      
      // Try localStorage as backup
      if (this.localStorageSupported) {
        try {
          this.clearLocalStorage(options);
        } catch (lsError) {
          // Give up
        }
      }
    }
  }

  /**
   * Store entry in IndexedDB
   */
  private setInIndexedDB<T>(entry: CacheEntry<T>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(this.options.storeName!, 'readwrite');
        const store = transaction.objectStore(this.options.storeName!);
        
        const request = store.put(entry);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get entry from IndexedDB
   */
  private getFromIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    return new Promise<CacheEntry<T> | null>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(this.options.storeName!, 'readonly');
        const store = transaction.objectStore(this.options.storeName!);
        
        const request = store.get(key);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result as CacheEntry<T>);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Remove entry from IndexedDB
   */
  private removeFromIndexedDB(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(this.options.storeName!, 'readwrite');
        const store = transaction.objectStore(this.options.storeName!);
        
        const request = store.delete(key);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear entries from IndexedDB with filters
   */
  private clearIndexedDB(options: { olderThan?: number; tags?: string[] }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      try {
        const transaction = this.db.transaction(this.options.storeName!, 'readwrite');
        const store = transaction.objectStore(this.options.storeName!);
        
        if (!options.olderThan && !options.tags?.length) {
          // Clear everything if no filters specified
          const request = store.clear();
          
          request.onsuccess = () => {
            resolve();
          };
          
          request.onerror = (event) => {
            reject((event.target as IDBRequest).error);
          };
          
          return;
        }
        
        // Get all entries to filter them
        const request = store.openCursor();
        const keysToDelete: string[] = [];
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          
          if (cursor) {
            const entry = cursor.value as CacheEntry<any>;
            let shouldDelete = true;
            
            // Check timestamp filter
            if (options.olderThan && entry.timestamp >= options.olderThan) {
              shouldDelete = false;
            }
            
            // Check tags filter
            if (shouldDelete && options.tags?.length) {
              const hasAllTags = options.tags.every(tag => entry.tags.includes(tag));
              if (!hasAllTags) {
                shouldDelete = false;
              }
            }
            
            if (shouldDelete) {
              keysToDelete.push(entry.key);
            }
            
            cursor.continue();
          } else {
            // Delete all matched entries
            const deletePromises = keysToDelete.map(key => this.removeFromIndexedDB(key));
            
            Promise.all(deletePromises)
              .then(() => resolve())
              .catch(reject);
          }
        };
        
        request.onerror = (event) => {
          reject((event.target as IDBRequest).error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Store entry in localStorage
   */
  private setInLocalStorage<T>(entry: CacheEntry<T>): void {
    if (!this.localStorageSupported) {
      throw new Error('Local storage not supported');
    }
    
    const serialized = JSON.stringify(entry);
    
    if (serialized.length > this.options.maxLocalStorageSize!) {
      throw new Error(`Cache entry exceeds maximum size (${serialized.length} > ${this.options.maxLocalStorageSize})`);
    }
    
    // Get metadata
    let meta: Record<string, { timestamp: number; expiry: number | null }> = {};
    try {
      const metaStr = localStorage.getItem(this.localStorageMetaKey);
      if (metaStr) {
        meta = JSON.parse(metaStr);
      }
    } catch (e) {
      // Reset metadata if corrupted
      meta = {};
    }
    
    // Update metadata
    meta[entry.key] = {
      timestamp: entry.timestamp,
      expiry: entry.expiry
    };
    
    // Store the entry and metadata
    localStorage.setItem(this.localStoragePrefix + entry.key, serialized);
    localStorage.setItem(this.localStorageMetaKey, JSON.stringify(meta));
  }

  /**
   * Get entry from localStorage
   */
  private getFromLocalStorage<T>(key: string): CacheEntry<T> | null {
    if (!this.localStorageSupported) {
      return null;
    }
    
    const serialized = localStorage.getItem(this.localStoragePrefix + key);
    
    if (!serialized) {
      return null;
    }
    
    try {
      return JSON.parse(serialized) as CacheEntry<T>;
    } catch (e) {
      // Remove corrupted entry
      this.removeFromLocalStorage(key);
      return null;
    }
  }

  /**
   * Remove entry from localStorage
   */
  private removeFromLocalStorage(key: string): void {
    if (!this.localStorageSupported) {
      return;
    }
    
    // Remove entry
    localStorage.removeItem(this.localStoragePrefix + key);
    
    // Update metadata
    try {
      const metaStr = localStorage.getItem(this.localStorageMetaKey);
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        delete meta[key];
        localStorage.setItem(this.localStorageMetaKey, JSON.stringify(meta));
      }
    } catch (e) {
      // If metadata is corrupted, just remove it
      localStorage.removeItem(this.localStorageMetaKey);
    }
  }

  /**
   * Clear entries from localStorage with filters
   */
  private clearLocalStorage(options: { olderThan?: number; tags?: string[] }): void {
    if (!this.localStorageSupported) {
      return;
    }
    
    if (!options.olderThan && !options.tags?.length) {
      // Clear all cache entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.localStoragePrefix)) {
          localStorage.removeItem(key);
        }
      }
      localStorage.removeItem(this.localStorageMetaKey);
      return;
    }
    
    // Selective clearing
    try {
      const metaStr = localStorage.getItem(this.localStorageMetaKey);
      if (!metaStr) {
        return; // No cache entries
      }
      
      const meta = JSON.parse(metaStr);
      const keysToDelete: string[] = [];
      
      // Filter by timestamp first, which we can do from metadata
      if (options.olderThan) {
        Object.entries(meta).forEach(([key, info]) => {
          if ((info as any).timestamp < options.olderThan!) {
            keysToDelete.push(key);
          }
        });
      } else {
        // All keys are candidates if no timestamp filter
        keysToDelete.push(...Object.keys(meta));
      }
      
      // Filter by tags if specified (requires loading the actual entries)
      if (options.tags?.length && keysToDelete.length > 0) {
        const filteredKeys: string[] = [];
        
        for (const key of keysToDelete) {
          const entryStr = localStorage.getItem(this.localStoragePrefix + key);
          if (entryStr) {
            try {
              const entry = JSON.parse(entryStr) as CacheEntry<any>;
              const hasAllTags = options.tags.every(tag => entry.tags.includes(tag));
              if (hasAllTags) {
                filteredKeys.push(key);
              }
            } catch (e) {
              // If entry is corrupted, delete it anyway
              filteredKeys.push(key);
            }
          } else {
            // Entry doesn't exist but is in metadata, clean up metadata
            filteredKeys.push(key);
          }
        }
        
        keysToDelete.length = 0;
        keysToDelete.push(...filteredKeys);
      }
      
      // Delete filtered entries
      for (const key of keysToDelete) {
        localStorage.removeItem(this.localStoragePrefix + key);
        delete meta[key];
      }
      
      // Update metadata
      localStorage.setItem(this.localStorageMetaKey, JSON.stringify(meta));
    } catch (e) {
      // If metadata is corrupted, just clear everything
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.localStoragePrefix)) {
          localStorage.removeItem(key);
        }
      }
      localStorage.removeItem(this.localStorageMetaKey);
    }
  }
}

// Export singleton instance
export const persistentCache = PersistentCache.getInstance(); 