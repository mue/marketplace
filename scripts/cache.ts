import fse from 'fs-extra';
import crypto from 'crypto';

import { CACHE_CONFIG } from './config.js';

export interface CacheEntry {
  created_at: string;
  updated_at: string;
  contentHash: string;
  cachedAt: number;
  colour?: string;
  blurhash?: string;
  photo_blurhashes?: Record<string, string>;
  isDark?: boolean;
  isLight?: boolean;
}

export interface CacheStorage {
  version: string;
  entries: Record<string, CacheEntry>;
}

export class BuildCache {
  private cachePath: string;
  private cache: CacheStorage;

  constructor(version: string) {
    this.cachePath = `${CACHE_CONFIG.CACHE_DIR}/build-cache.json`;
    this.cache = {
      version,
      entries: {},
    };
  }

  async load(): Promise<void> {
    try {
      await fse.ensureDir(CACHE_CONFIG.CACHE_DIR);

      if (await fse.pathExists(this.cachePath)) {
        const data = await fse.readJSON(this.cachePath);

        if (data.version !== this.cache.version) {
          console.log('Cache version mismatch, invalidating cache');
          return;
        }

        this.cache = data;
        console.log(`Loaded build cache with ${Object.keys(this.cache.entries).length} entries`);
      }
    } catch (error) {
      console.warn('Failed to load cache, starting fresh:', error);
    }
  }

  async save(): Promise<void> {
    try {
      this.cleanExpired();

      await fse.ensureDir(CACHE_CONFIG.CACHE_DIR);
      await fse.writeJSON(this.cachePath, this.cache, { spaces: 2 });
      console.log(`Saved build cache with ${Object.keys(this.cache.entries).length} entries`);
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  get(canonicalPath: string, currentContentHash: string): CacheEntry | undefined {
    const entry = this.cache.entries[canonicalPath];

    if (!entry) {
      return undefined;
    }

    if (entry.contentHash !== currentContentHash) {
      return undefined;
    }

    if (!this.isEntryValid(entry)) {
      delete this.cache.entries[canonicalPath];
      return undefined;
    }

    return entry;
  }

  set(canonicalPath: string, entry: CacheEntry): void {
    this.cache.entries[canonicalPath] = {
      ...entry,
      cachedAt: Date.now(),
    };
  }

  private isEntryValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.cachedAt;
    return age < CACHE_CONFIG.MAX_AGE_MS;
  }

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
      console.log(`Cleaned ${removed} expired cache entries`);
    }

    return removed;
  }

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

export function computeContentHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
