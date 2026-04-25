import { describe, it, expect } from 'vitest';

import {
  VALIDATION_CONFIG,
  ID_CONFIG,
  BUILD_CONFIG,
  CACHE_CONFIG,
  OUTPUT_CONFIG,
  REPO_CONFIG,
} from '../scripts/config.js';

describe('VALIDATION_CONFIG', () => {
  it('should have correct required fields for photo_packs', () => {
    expect(VALIDATION_CONFIG.REQUIRED_FIELDS.photo_packs).toEqual([
      'name',
      'description',
      'author',
      'icon_url',
      'photos',
    ]);
  });

  it('should have correct required fields for quote_packs', () => {
    expect(VALIDATION_CONFIG.REQUIRED_FIELDS.quote_packs).toEqual([
      'name',
      'description',
      'author',
      'quotes',
    ]);
  });

  it('should have correct required fields for preset_settings', () => {
    expect(VALIDATION_CONFIG.REQUIRED_FIELDS.preset_settings).toEqual([
      'name',
      'description',
      'author',
      'settings',
    ]);
  });
});

describe('ID_CONFIG', () => {
  it('should have a positive hash length', () => {
    expect(ID_CONFIG.HASH_LENGTH).toBeGreaterThan(0);
  });

  it('should specify a hash algorithm', () => {
    expect(ID_CONFIG.HASH_ALGORITHM).toBeTruthy();
  });
});

describe('BUILD_CONFIG', () => {
  it('should have a positive concurrency limit', () => {
    expect(BUILD_CONFIG.CONCURRENCY_LIMIT).toBeGreaterThan(0);
  });

  it('should have positive blurhash resize dimensions', () => {
    expect(BUILD_CONFIG.BLURHASH_RESIZE_WIDTH).toBeGreaterThan(0);
    expect(BUILD_CONFIG.BLURHASH_RESIZE_HEIGHT).toBeGreaterThan(0);
  });

  it('should have positive blurhash component counts', () => {
    expect(BUILD_CONFIG.BLURHASH_COMPONENTS_X).toBeGreaterThan(0);
    expect(BUILD_CONFIG.BLURHASH_COMPONENTS_Y).toBeGreaterThan(0);
  });

  it('should have a positive photo fetch timeout', () => {
    expect(BUILD_CONFIG.PHOTO_FETCH_TIMEOUT_MS).toBeGreaterThan(0);
  });
});

describe('CACHE_CONFIG', () => {
  it('should have a non-empty cache directory name', () => {
    expect(typeof CACHE_CONFIG.CACHE_DIR).toBe('string');
    expect(CACHE_CONFIG.CACHE_DIR.length).toBeGreaterThan(0);
  });

  it('should have a positive max age in milliseconds', () => {
    expect(CACHE_CONFIG.MAX_AGE_MS).toBeGreaterThan(0);
  });

  it('should have MAX_AGE_MS consistent with MAX_AGE_DAYS', () => {
    expect(CACHE_CONFIG.MAX_AGE_MS).toBe(CACHE_CONFIG.MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  });
});

describe('OUTPUT_CONFIG', () => {
  it('should have a positive recent items count', () => {
    expect(OUTPUT_CONFIG.RECENT_ITEMS_COUNT).toBeGreaterThan(0);
  });

  it('should have a non-empty schema version string', () => {
    expect(typeof OUTPUT_CONFIG.SCHEMA_VERSION).toBe('string');
    expect(OUTPUT_CONFIG.SCHEMA_VERSION.length).toBeGreaterThan(0);
  });
});

describe('REPO_CONFIG', () => {
  it('should have a non-empty GitHub URL', () => {
    expect(typeof REPO_CONFIG.GITHUB_URL).toBe('string');
    expect(REPO_CONFIG.GITHUB_URL.length).toBeGreaterThan(0);
  });

  it('should have a non-empty clone directory name', () => {
    expect(typeof REPO_CONFIG.CF_PAGES_CLONE_DIR).toBe('string');
    expect(REPO_CONFIG.CF_PAGES_CLONE_DIR.length).toBeGreaterThan(0);
  });
});
