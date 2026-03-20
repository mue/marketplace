import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuildCache } from '../../scripts/cache.js';
import { CACHE_CONFIG } from '../../scripts/config.js';

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJSON: vi.fn(),
    writeJSON: vi.fn().mockResolvedValue(undefined),
  },
}));

import fse from 'fs-extra';
const mockedFse = vi.mocked(fse);

describe('BuildCache.save', () => {
  let cache: BuildCache;

  beforeEach(() => {
    vi.resetAllMocks();
    mockedFse.ensureDir = vi.fn().mockResolvedValue(undefined);
    mockedFse.pathExists = vi.fn().mockResolvedValue(false);
    mockedFse.writeJSON = vi.fn().mockResolvedValue(undefined);
    cache = new BuildCache('1.0.0');
  });

  it('should write the cache to disk', async () => {
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'abc123',
      cachedAt: Date.now(),
    });

    await cache.save();

    expect(mockedFse.writeJSON).toHaveBeenCalledOnce();
    const [, written] = (mockedFse.writeJSON as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(written.entries['photo_packs/nature']).toBeDefined();
  });

  it('should purge expired entries before writing', async () => {
    const dateSpy = vi.spyOn(Date, 'now');

    dateSpy.mockReturnValue(0);
    cache.set('photo_packs/old', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'old_hash',
      cachedAt: 0,
    });

    dateSpy.mockReturnValue(CACHE_CONFIG.MAX_AGE_MS + 1);
    cache.set('photo_packs/new', {
      created_at: '2025-01-02T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
      contentHash: 'new_hash',
      cachedAt: CACHE_CONFIG.MAX_AGE_MS + 1,
    });

    await cache.save();

    const [, written] = (mockedFse.writeJSON as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(written.entries['photo_packs/old']).toBeUndefined();
    expect(written.entries['photo_packs/new']).toBeDefined();

    dateSpy.mockRestore();
  });

  it('should handle write failures gracefully', async () => {
    mockedFse.writeJSON = vi.fn().mockRejectedValue(new Error('Disk full'));

    await expect(cache.save()).resolves.not.toThrow();
  });
});
