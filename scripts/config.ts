export const REPO_CONFIG = {
  GITHUB_URL: 'https://github.com/mue/marketplace',
  CF_PAGES_CLONE_DIR: 'build',
} as const;

export const BUILD_CONFIG = {
  CONCURRENCY_LIMIT: 10,
  BLURHASH_RESIZE_WIDTH: 32,
  BLURHASH_RESIZE_HEIGHT: 32,
  BLURHASH_COMPONENTS_X: 4,
  BLURHASH_COMPONENTS_Y: 4,
  COLOR_SATURATION_MULTIPLIER: 1.75,
  PHOTO_PROCESSING_RATE_LIMIT: 20,
  PHOTO_FETCH_TIMEOUT_MS: 5000,
} as const;

export const CACHE_CONFIG = {
  CACHE_DIR: '.build-cache',
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
  MAX_AGE_DAYS: 7,
} as const;

export const ID_CONFIG = {
  HASH_LENGTH: 12,
  HASH_ALGORITHM: 'sha256',
} as const;

export const OUTPUT_CONFIG = {
  RECENT_ITEMS_COUNT: 20,
  SCHEMA_VERSION: '3.0',
} as const;

export const VALIDATION_CONFIG = {
  REQUIRED_FIELDS: {
    photo_packs: ['name', 'description', 'author', 'icon_url', 'photos'],
    quote_packs: ['name', 'description', 'author', 'quotes'],
    preset_settings: ['name', 'description', 'author', 'settings'],
  },
} as const;
