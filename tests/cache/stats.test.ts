import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BuildCache } from '../../scripts/cache.js';

describe('BuildCache.getStats', () => {
  let cache: BuildCache;

  beforeEach(() => {
    cache = new BuildCache('1.0.0');
  });

  it('should return zero totals and null timestamps for an empty cache', () => {
    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.oldestEntry).toBeNull();
    expect(stats.newestEntry).toBeNull();
  });

  it('should return the correct total after adding entries', () => {
    cache.set('photo_packs/a', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'h1',
      cachedAt: Date.now(),
    });

    cache.set('photo_packs/b', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'h2',
      cachedAt: Date.now(),
    });

    expect(cache.getStats().totalEntries).toBe(2);
  });

  it('should track oldest and newest entry timestamps', () => {
    const dateSpy = vi.spyOn(Date, 'now');

    dateSpy.mockReturnValue(1000);
    cache.set('photo_packs/a', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'h1',
      cachedAt: 1000,
    });

    dateSpy.mockReturnValue(5000);
    cache.set('photo_packs/b', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'h2',
      cachedAt: 5000,
    });

    const stats = cache.getStats();
    expect(stats.oldestEntry).toBe(1000);
    expect(stats.newestEntry).toBe(5000);

    dateSpy.mockRestore();
  });

  it('should report the same value for oldest and newest when there is one entry', () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(3000);
    cache.set('photo_packs/a', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'h1',
      cachedAt: 3000,
    });

    const stats = cache.getStats();
    expect(stats.oldestEntry).toBe(3000);
    expect(stats.newestEntry).toBe(3000);

    dateSpy.mockRestore();
  });
});
