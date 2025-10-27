import crypto from 'crypto';
import type { ItemData, FolderType } from './types.js';
import { ID_CONFIG, VALIDATION_CONFIG } from './config.js';

/**
 * Result type for operations that can fail
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field?: string;
  message: string;
  canonicalPath: string;
}

/**
 * Generate a stable hash ID from canonical path and author.
 * 
 * Uses SHA-256 hashing to create a deterministic, unique identifier
 * for marketplace items. The hash is based on the item's canonical path
 * and author, ensuring consistency across builds.
 * 
 * @param canonicalPath - The item's canonical path (e.g., "photo_packs/nature")
 * @param author - The item's author username
 * @returns A truncated hex hash of the specified length (default: 12 characters)
 * 
 * @example
 * ```ts
 * const id = generateStableHash("photo_packs/nature", "johndoe");
 * // Returns: "a1b2c3d4e5f6"
 * ```
 */
export function generateStableHash(canonicalPath: string, author: string): string {
  const content = `${canonicalPath}:${author}`;
  return crypto
    .createHash(ID_CONFIG.HASH_ALGORITHM)
    .update(content)
    .digest('hex')
    .slice(0, ID_CONFIG.HASH_LENGTH);
}

/**
 * Generate a URL-friendly slug from a display name.
 * 
 * Converts a human-readable name into a lowercase, hyphenated slug
 * suitable for URLs and file paths. Non-alphanumeric characters are
 * converted to hyphens, and leading/trailing hyphens are removed.
 * 
 * @param name - The display name to convert
 * @returns A URL-safe slug string
 * 
 * @example
 * ```ts
 * generateSlug("Beautiful Nature Photos!");
 * // Returns: "beautiful-nature-photos"
 * 
 * generateSlug("___Test---Name___");
 * // Returns: "test-name"
 * ```
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate searchable text from item metadata.
 * 
 * Combines multiple item fields into a single normalized string
 * for full-text search indexing. All text is lowercased for
 * case-insensitive matching.
 * 
 * @param item - The item data object
 * @param canonicalPath - The item's canonical path
 * @param author - The item's author
 * @returns Normalized search text string
 * 
 * @example
 * ```ts
 * const searchText = generateSearchText(
 *   { name: "Nature", description: "Beautiful photos" },
 *   "photo_packs/nature",
 *   "johndoe"
 * );
 * // Returns: "nature beautiful photos johndoe photo_packs nature"
 * ```
 */
export function generateSearchText(
  item: ItemData,
  canonicalPath: string,
  author: string
): string {
  const parts = [
    item.name,
    item.description,
    author,
    canonicalPath.replace('/', ' '),
    item.language || '',
  ];
  return parts.join(' ').toLowerCase();
}

/**
 * Validate that an item has all required fields for its type.
 * 
 * Performs comprehensive validation including:
 * - Presence of all required fields for the item type
 * - Non-empty arrays for photos/quotes where applicable
 * - Type-specific validation rules
 * 
 * Returns a Result object instead of throwing to allow for better
 * error handling and recovery.
 * 
 * @param file - The item data to validate
 * @param folder - The item type/category
 * @param canonicalPath - The item's canonical path (for error messages)
 * @returns Result object with validation status and any errors
 * 
 * @example
 * ```ts
 * const result = validateItem(itemData, "photo_packs", "photo_packs/nature");
 * if (!result.success) {
 *   console.error("Validation failed:", result.error);
 * }
 * ```
 */
export function validateItem(
  file: ItemData,
  folder: FolderType,
  canonicalPath: string
): Result<void, ValidationError> {
  const requiredFields = VALIDATION_CONFIG.REQUIRED_FIELDS[folder];

  // Check for missing required fields
  for (const field of requiredFields) {
    if (!(file as any)[field]) {
      return {
        success: false,
        error: {
          field,
          message: `Missing required field "${field}"`,
          canonicalPath,
        },
      };
    }
  }

  // Type-specific validation
  if (folder === 'photo_packs') {
    const photos = (file as any).photos;
    if (!Array.isArray(photos) || photos.length === 0) {
      return {
        success: false,
        error: {
          field: 'photos',
          message: 'Photo pack must contain at least one photo',
          canonicalPath,
        },
      };
    }
  }

  if (folder === 'quote_packs') {
    const quotes = (file as any).quotes;
    if (!Array.isArray(quotes) || quotes.length === 0) {
      return {
        success: false,
        error: {
          field: 'quotes',
          message: 'Quote pack must contain at least one quote',
          canonicalPath,
        },
      };
    }
  }

  return { success: true };
}

/**
 * Format a validation error as a human-readable string.
 * 
 * @param error - The validation error object
 * @returns Formatted error message
 * 
 * @example
 * ```ts
 * const errorMsg = formatValidationError({
 *   field: "name",
 *   message: "Missing required field",
 *   canonicalPath: "photo_packs/nature"
 * });
 * // Returns: "VALIDATION ERROR [photo_packs/nature]: Missing required field (field: name)"
 * ```
 */
export function formatValidationError(error: ValidationError): string {
  const fieldInfo = error.field ? ` (field: ${error.field})` : '';
  return `VALIDATION ERROR [${error.canonicalPath}]: ${error.message}${fieldInfo}`;
}
