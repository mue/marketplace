import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuildCache } from '../../scripts/cache.js';
import { CACHE_CONFIG } from '../../scripts/config.js';

describe('BuildCache.get / set', () => {
  let cache: BuildCache;

  beforeEach(() => {
    cache = new BuildCache('1.0.0');
  });

  it('should return undefined for an entry that was never set', () => {
    expect(cache.get('photo_packs/nature', 'abc123')).toBeUndefined();
  });

  it('should return the entry after it is set', () => {
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'abc123',
      cachedAt: Date.now(),
    });

    const result = cache.get('photo_packs/nature', 'abc123');
    expect(result).toBeDefined();
    expect(result?.contentHash).toBe('abc123');
  });

  it('should return undefined when the content hash does not match', () => {
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'abc123',
      cachedAt: Date.now(),
    });

    expect(cache.get('photo_packs/nature', 'different_hash')).toBeUndefined();
  });

  it('should store and retrieve optional fields', () => {
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
      contentHash: 'abc123',
      cachedAt: Date.now(),
      colour: '#ff0000',
      blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
      isDark: true,
      isLight: false,
    });

    const result = cache.get('photo_packs/nature', 'abc123');
    expect(result?.colour).toBe('#ff0000');
    expect(result?.blurhash).toBe('L6PZfSi_.AyE_3t7t7R**0o#DgR4');
    expect(result?.isDark).toBe(true);
    expect(result?.isLight).toBe(false);
  });

  it('should overwrite cachedAt with the current time on set', () => {
    const before = Date.now();
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'abc123',
      cachedAt: 0, // intentionally old — should be overwritten
    });
    const after = Date.now();

    const result = cache.get('photo_packs/nature', 'abc123');
    expect(result?.cachedAt).toBeGreaterThanOrEqual(before);
    expect(result?.cachedAt).toBeLessThanOrEqual(after);
  });

  it('should return undefined for an expired entry', () => {
    const dateSpy = vi.spyOn(Date, 'now');

    dateSpy.mockReturnValue(0);
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'abc123',
      cachedAt: 0,
    });

    dateSpy.mockReturnValue(CACHE_CONFIG.MAX_AGE_MS + 1);
    expect(cache.get('photo_packs/nature', 'abc123')).toBeUndefined();

    dateSpy.mockRestore();
  });

  it('should return the entry when it is just within the expiry window', () => {
    const dateSpy = vi.spyOn(Date, 'now');

    dateSpy.mockReturnValue(0);
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'abc123',
      cachedAt: 0,
    });

    dateSpy.mockReturnValue(CACHE_CONFIG.MAX_AGE_MS - 1);
    expect(cache.get('photo_packs/nature', 'abc123')).toBeDefined();

    dateSpy.mockRestore();
  });

  it('should isolate entries by canonical path', () => {
    cache.set('photo_packs/nature', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'hash_a',
      cachedAt: Date.now(),
    });
    cache.set('photo_packs/cities', {
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      contentHash: 'hash_b',
      cachedAt: Date.now(),
    });

    expect(cache.get('photo_packs/nature', 'hash_a')).toBeDefined();
    expect(cache.get('photo_packs/cities', 'hash_b')).toBeDefined();
    expect(cache.get('photo_packs/nature', 'hash_b')).toBeUndefined();
  });
});
