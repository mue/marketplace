import crypto from 'crypto';

import type { ItemData, FolderType, PhotoPackItem, QuotePackItem } from './types.js';
import { ID_CONFIG, VALIDATION_CONFIG } from './config.js';


export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface ValidationError {
  field?: string;
  message: string;
  canonicalPath: string;
}

export function generateStableHash(canonicalPath: string, author: string): string {
  const content = `${canonicalPath}:${author}`;
  return crypto
    .createHash(ID_CONFIG.HASH_ALGORITHM)
    .update(content)
    .digest('hex')
    .slice(0, ID_CONFIG.HASH_LENGTH);
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSearchText(item: ItemData, canonicalPath: string, author: string): string {
  const parts = [
    item.name,
    item.description,
    author,
    canonicalPath.replace('/', ' '),
    item.language || '',
  ];

  return parts.join(' ').toLowerCase();
}


export function validateItem(
  file: ItemData,
  folder: FolderType,
  canonicalPath: string,
): Result<void, ValidationError> {
  const requiredFields = VALIDATION_CONFIG.REQUIRED_FIELDS[folder];

  for (const field of requiredFields) {
    if (!(file as unknown as Record<string, unknown>)[field]) {
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

  if (folder === 'photo_packs') {
    const photoFile = file as PhotoPackItem;
    const photos = photoFile.photos;
    const apiEnabled = photoFile.api_enabled;

    if (!Array.isArray(photos)) {
      return {
        success: false,
        error: {
          field: 'photos',
          message: 'Missing required field "photos"',
          canonicalPath,
        },
      };
    }

    if (photos.length === 0 && !apiEnabled) {
      return {
        success: false,
        error: {
          field: 'photos',
          message: 'Photo pack must contain at least one photo (or set api_enabled: true)',
          canonicalPath,
        },
      };
    }

    if (apiEnabled) {
      if (!photoFile.api_provider) {
        return {
          success: false,
          error: {
            field: 'api_provider',
            message: 'api_enabled pack missing required field "api_provider"',
            canonicalPath,
          },
        };
      }

      if (!photoFile.api_endpoint) {
        return {
          success: false,
          error: {
            field: 'api_endpoint',
            message: 'api_enabled pack missing required field "api_endpoint"',
            canonicalPath,
          },
        };
      }

      const schema = photoFile.settings_schema;
      if (!Array.isArray(schema) || schema.length === 0) {
        return {
          success: false,
          error: {
            field: 'settings_schema',
            message: 'api_enabled pack missing required field "settings_schema"',
            canonicalPath,
          },
        };
      }
    }
  }

  if (folder === 'quote_packs') {
    const quotes = (file as QuotePackItem).quotes;
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

export function formatValidationError(error: ValidationError): string {
  const fieldInfo = error.field ? ` (field: ${error.field})` : '';
  return `VALIDATION ERROR [${error.canonicalPath}]: ${error.message}${fieldInfo}`;
}
