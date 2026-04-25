import { describe, it, expect, vi, beforeEach } from 'vitest';
import fse from 'fs-extra';

import { BuildCache } from '../../scripts/cache.js';

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJSON: vi.fn(),
    writeJSON: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockedFse = vi.mocked(fse);

describe('BuildCache.load', () => {
  let cache: BuildCache;

  beforeEach(() => {
    vi.resetAllMocks();
    mockedFse.ensureDir = vi.fn().mockResolvedValue(undefined);
    mockedFse.writeJSON = vi.fn().mockResolvedValue(undefined);
    cache = new BuildCache('1.0.0');
  });

  it('should start with an empty cache when no file exists', async () => {
    mockedFse.pathExists = vi.fn().mockResolvedValue(false);

    await cache.load();

    expect(cache.getStats().totalEntries).toBe(0);
  });

  it('should load entries from an existing cache file', async () => {
    const now = Date.now();
    mockedFse.pathExists = vi.fn().mockResolvedValue(true);
    mockedFse.readJSON = vi.fn().mockResolvedValue({
      version: '1.0.0',
      entries: {
        'photo_packs/nature': {
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          contentHash: 'abc123',
          cachedAt: now,
        },
      },
    });

    await cache.load();

    expect(cache.getStats().totalEntries).toBe(1);
    expect(cache.get('photo_packs/nature', 'abc123')).toBeDefined();
  });

  it('should invalidate the cache when the version does not match', async () => {
    mockedFse.pathExists = vi.fn().mockResolvedValue(true);
    mockedFse.readJSON = vi.fn().mockResolvedValue({
      version: '0.9.0',
      entries: {
        'photo_packs/nature': {
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          contentHash: 'abc123',
          cachedAt: Date.now(),
        },
      },
    });

    await cache.load();

    expect(cache.getStats().totalEntries).toBe(0);
  });

  it('should handle a corrupted cache file gracefully', async () => {
    mockedFse.pathExists = vi.fn().mockResolvedValue(true);
    mockedFse.readJSON = vi.fn().mockRejectedValue(new Error('JSON parse error'));

    await expect(cache.load()).resolves.not.toThrow();
    expect(cache.getStats().totalEntries).toBe(0);
  });
});
