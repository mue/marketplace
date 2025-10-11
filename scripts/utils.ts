import crypto from 'crypto';
import type { ItemData, FolderType } from './types.js';

/**
 * Generate a stable hash ID from canonical path and author
 * @param {string} canonicalPath - The item's canonical path (e.g., "photo_packs/nature")
 * @param {string} author - The item's author
 * @returns {string} 12-character hash
 */
export function generateStableHash(canonicalPath: string, author: string): string {
  const content = `${canonicalPath}:${author}`;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

/**
 * Generate URL-friendly slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract tags from text (name + description)
 */
export function extractTags(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now', 'source']);

  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !commonWords.has(w));

  // Get unique words and take top frequent ones
  const wordFreq = new Map<string, number>();
  words.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Generate search text for full-text search
 */
export function generateSearchText(item: ItemData, canonicalPath: string, author: string): string {
  const parts = [
    item.name,
    item.description,
    author,
    canonicalPath.replace('/', ' '),
    item.language || ''
  ];
  return parts.join(' ').toLowerCase();
}

// Required fields schema for validation
export const REQUIRED_FIELDS: Record<FolderType, string[]> = {
  photo_packs: ['name', 'description', 'author', 'icon_url', 'photos'],
  quote_packs: ['name', 'description', 'author', 'quotes'],
  preset_settings: ['name', 'description', 'author', 'settings']
};

/**
 * Validate item has all required fields
 * @param {Object} file - The item data
 * @param {string} folder - The category folder
 * @param {string} canonicalPath - The item's canonical path
 * @throws {Error} if validation fails
 */
export function validateItem(file: ItemData, folder: FolderType, canonicalPath: string): void {
  const requiredFields = REQUIRED_FIELDS[folder];
  for (const field of requiredFields) {
    if (!(file as any)[field]) {
      throw new Error(`VALIDATION ERROR: ${canonicalPath} missing required field "${field}"`);
    }
  }

  // Validate item counts
  if (folder === 'photo_packs' && (!(file as any).photos || (file as any).photos.length === 0)) {
    throw new Error(`VALIDATION ERROR: ${canonicalPath} has no photos`);
  }
  if (folder === 'quote_packs' && (!(file as any).quotes || (file as any).quotes.length === 0)) {
    throw new Error(`VALIDATION ERROR: ${canonicalPath} has no quotes`);
  }
}
