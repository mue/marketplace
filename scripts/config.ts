/**
 * Configuration constants for the marketplace bundler
 */

/**
 * Build performance and processing limits
 */
export const BUILD_CONFIG = {
  /** Maximum number of concurrent async operations */
  CONCURRENCY_LIMIT: 10,
  
  /** Number of items to resize for blurhash generation */
  BLURHASH_RESIZE_WIDTH: 32,
  BLURHASH_RESIZE_HEIGHT: 32,
  
  /** Blurhash component counts for encoding quality */
  BLURHASH_COMPONENTS_X: 4,
  BLURHASH_COMPONENTS_Y: 4,
  
  /** Color saturation multiplier for icon color extraction */
  COLOR_SATURATION_MULTIPLIER: 1.75,
  
  /** Rate limit for photo blurhash processing (photos per second) */
  PHOTO_PROCESSING_RATE_LIMIT: 20,
  
  /** Timeout for fetching individual photo URLs (milliseconds) */
  PHOTO_FETCH_TIMEOUT_MS: 5000,
} as const;

/**
 * Cache management settings
 */
export const CACHE_CONFIG = {
  /** Directory name for build cache storage */
  CACHE_DIR: '.build-cache',
  
  /** Maximum age of cache entries in milliseconds (7 days) */
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,
  
  /** Maximum age of cache entries in days (for display) */
  MAX_AGE_DAYS: 7,
} as const;

/**
 * ID and hash generation settings
 */
export const ID_CONFIG = {
  /** Length of generated hash IDs */
  HASH_LENGTH: 12,
  
  /** Hash algorithm to use */
  HASH_ALGORITHM: 'sha256',
} as const;

/**
 * Output and statistics configuration
 */
export const OUTPUT_CONFIG = {
  /** Number of recent items to include in stats */
  RECENT_ITEMS_COUNT: 20,
  
  /** Schema version for manifest files */
  SCHEMA_VERSION: '2.1',
} as const;

/**
 * Field requirements for validation
 */
export const VALIDATION_CONFIG = {
  /** Required fields for each item type */
  REQUIRED_FIELDS: {
    photo_packs: ['name', 'description', 'author', 'icon_url', 'photos'],
    quote_packs: ['name', 'description', 'author', 'quotes'],
    preset_settings: ['name', 'description', 'author', 'settings'],
  },
} as const;
