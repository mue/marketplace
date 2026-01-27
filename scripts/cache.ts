import fse from 'fs-extra';
import crypto from 'crypto';
import { CACHE_CONFIG } from './config.js';

/**
 * Cache entry structure for storing processed item data
 */
export interface CacheEntry {
  /** ISO timestamp of item creation */
  created_at: string;
  /** ISO timestamp of last update */
  updated_at: string;
  /** Hash of file content for change detection */
  contentHash: string;
  /** Timestamp when cache entry was created */
  cachedAt: number;
  /** Extracted color from icon */
  colour?: string;
  /** Blurhash of icon */
  blurhash?: string;
  /** Blurhashes for individual photos keyed by photo URL */
  photo_blurhashes?: Record<string, string>;
  /** Whether the icon is dark */
  isDark?: boolean;
  /** Whether the icon is light */
  isLight?: boolean;
}

/**
 * Cache storage structure
 */
export interface CacheStorage {
  version: string;
  entries: Record<string, CacheEntry>;
}

/**
 * Cache manager for build optimization.
 * 
 * Stores processed item metadata (git history, colors, blurhash) to avoid
 * reprocessing unchanged items. Uses content hashing to detect changes
 * and automatic expiration for stale entries.
 */
export class BuildCache {
  private cachePath: string;
  private cache: CacheStorage;

  /**
   * Create a new build cache instance.
   * 
   * @param version - Version string for cache invalidation
   * 
   * @example
   * ```ts
   * const cache = new BuildCache("1.0.0");
   * await cache.load();
   * ```
   */
  constructor(version: string) {
    this.cachePath = `${CACHE_CONFIG.CACHE_DIR}/build-cache.json`;
    this.cache = {
      version,
      entries: {},
    };
  }

  /**
   * Load cache from disk if it exists.
   * 
   * Automatically invalidates cache if version doesn't match or if
   * cache file is corrupted. Creates cache directory if needed.
   * 
   * @returns Promise that resolves when cache is loaded
   */
  async load(): Promise<void> {
    try {
      await fse.ensureDir(CACHE_CONFIG.CACHE_DIR);

      if (await fse.pathExists(this.cachePath)) {
        const data = await fse.readJSON(this.cachePath);

        // Invalidate cache if version changed
        if (data.version !== this.cache.version) {
          console.log('⚠️  Cache version mismatch, invalidating cache');
          return;
        }

        this.cache = data;
        console.log(`✅ Loaded build cache with ${Object.keys(this.cache.entries).length} entries`);
      }
    } catch (error) {
      console.warn('⚠️  Failed to load cache, starting fresh:', error);
    }
  }

  /**
   * Save cache to disk.
   * 
   * Cleans up expired entries before saving to keep cache file size minimal.
   * 
   * @returns Promise that resolves when cache is saved
   */
  async save(): Promise<void> {
    try {
      // Clean expired entries before saving
      this.cleanExpired();

      await fse.ensureDir(CACHE_CONFIG.CACHE_DIR);
      await fse.writeJSON(this.cachePath, this.cache, { spaces: 2 });
      console.log(`✅ Saved build cache with ${Object.keys(this.cache.entries).length} entries`);
    } catch (error) {
      console.error('❌ Failed to save cache:', error);
    }
  }

  /**
   * Get a cache entry for an item if it exists and is valid.
   * 
   * Validates the entry by checking:
   * - Content hash matches (file hasn't changed)
   * - Entry is not expired
   * 
   * @param canonicalPath - The item's canonical path
   * @param currentContentHash - Hash of current file content
   * @returns Cache entry if valid, undefined otherwise
   * 
   * @example
   * ```ts
   * const contentHash = computeContentHash(fileContent);
   * const cached = cache.get("photo_packs/nature", contentHash);
   * if (cached) {
   *   // Use cached data
   * }
   * ```
   */
  get(canonicalPath: string, currentContentHash: string): CacheEntry | undefined {
    const entry = this.cache.entries[canonicalPath];

    if (!entry) {
      return undefined;
    }

    // Check if content changed
    if (entry.contentHash !== currentContentHash) {
      return undefined;
    }

    // Check if expired
    if (!this.isEntryValid(entry)) {
      delete this.cache.entries[canonicalPath];
      return undefined;
    }

    return entry;
  }

  /**
   * Store a cache entry for an item.
   * 
   * @param canonicalPath - The item's canonical path
   * @param entry - Cache entry data to store
   * 
   * @example
   * ```ts
   * cache.set("photo_packs/nature", {
   *   created_at: "2025-01-01T00:00:00Z",
   *   updated_at: "2025-01-15T00:00:00Z",
   *   contentHash: "abc123",
   *   cachedAt: Date.now(),
   *   colour: "#ff0000"
   * });
   * ```
   */
  set(canonicalPath: string, entry: CacheEntry): void {
    this.cache.entries[canonicalPath] = {
      ...entry,
      cachedAt: Date.now(),
    };
  }

  /**
   * Check if a cache entry is still valid (not expired).
   * 
   * @param entry - The cache entry to check
   * @returns true if entry is valid, false if expired
   */
  private isEntryValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.cachedAt;
    return age < CACHE_CONFIG.MAX_AGE_MS;
  }

  /**
   * Remove all expired entries from the cache.
   * 
   * Called automatically during save() to keep cache size manageable.
   * 
   * @returns Number of entries removed
   */
  private cleanExpired(): number {
    const before = Object.keys(this.cache.entries).length;
    const now = Date.now();

    for (const [path, entry] of Object.entries(this.cache.entries)) {
      if (now - entry.cachedAt >= CACHE_CONFIG.MAX_AGE_MS) {
        delete this.cache.entries[path];
      }
    }

    const removed = before - Object.keys(this.cache.entries).length;
    if (removed > 0) {
      console.log(`🧹 Cleaned ${removed} expired cache entries`);
    }

    return removed;
  }

  /**
   * Get cache statistics.
   * 
   * @returns Object with cache metrics
   */
  getStats(): {
    totalEntries: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Object.values(this.cache.entries);

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const timestamps = entries.map((e) => e.cachedAt);

    return {
      totalEntries: entries.length,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  }
}

/**
 * Compute a hash of file content for change detection.
 * 
 * Uses SHA-256 to create a stable hash that changes when content changes.
 * This is more reliable than timestamps for detecting actual changes.
 * 
 * @param content - The file content to hash (as string or buffer)
 * @returns Hex-encoded hash string
 * 
 * @example
 * ```ts
 * const content = JSON.stringify(itemData);
 * const hash = computeContentHash(content);
 * // Returns: "a1b2c3d4e5f6..."
 * ```
 */
export function computeContentHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
