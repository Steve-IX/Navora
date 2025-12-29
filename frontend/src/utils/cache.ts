// Client-side caching utilities using IndexedDB and Memory Cache

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });

    // Clean up expired entries periodically
    this.cleanup();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    // Only cleanup occasionally to avoid performance issues
    if (Math.random() < 0.1) {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }
  }
}

// IndexedDB cache for persistent storage
class IndexedDBCache {
  private dbName = 'gps-mapping-cache';
  private storeName = 'cache';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttl || 24 * 60 * 60 * 1000), // 24 hours default
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry: CacheEntry<T> | undefined = request.result;
        if (!entry) {
          resolve(null);
          return;
        }

        const now = Date.now();
        if (now > entry.expiresAt) {
          // Entry expired, delete it
          this.delete(key);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Combined cache service
export class CacheService {
  private memoryCache: MemoryCache;
  private indexedDBCache: IndexedDBCache;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.indexedDBCache = new IndexedDBCache();
  }

  // Cache geocoding results (short TTL for memory, longer for IndexedDB)
  async cacheGeocode(key: string, data: any): Promise<void> {
    this.memoryCache.set(key, data, 5 * 60 * 1000); // 5 min memory
    await this.indexedDBCache.set(key, data, 24 * 60 * 60 * 1000); // 24h persistent
  }

  async getGeocode<T>(key: string): Promise<T | null> {
    // Check memory first
    const memoryData = this.memoryCache.get<T>(key);
    if (memoryData) return memoryData;

    // Check IndexedDB
    const dbData = await this.indexedDBCache.get<T>(key);
    if (dbData) {
      // Restore to memory cache
      this.memoryCache.set(key, dbData, 5 * 60 * 1000);
      return dbData;
    }

    return null;
  }

  // Cache API responses
  async cacheAPI(key: string, data: any, ttl?: number): Promise<void> {
    this.memoryCache.set(key, data, ttl);
    await this.indexedDBCache.set(key, data, ttl || 60 * 60 * 1000); // 1 hour default
  }

  async getAPI<T>(key: string): Promise<T | null> {
    const memoryData = this.memoryCache.get<T>(key);
    if (memoryData) return memoryData;

    const dbData = await this.indexedDBCache.get<T>(key);
    if (dbData) {
      this.memoryCache.set(key, dbData);
      return dbData;
    }

    return null;
  }

  // Clear all caches
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    await this.indexedDBCache.clear();
  }
}

export const cacheService = new CacheService();

