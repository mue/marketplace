import { describe, it, expect } from 'vitest';
import {
  generateStableHash,
  generateSlug,
  generateSearchText,
  validateItem,
  formatValidationError,
} from '../scripts/utils.js';
import { VALIDATION_CONFIG, ID_CONFIG } from '../scripts/config.js';
import type {
  PhotoPackItem,
  QuotePackItem,
  PresetSettingsItem,
} from '../scripts/types.js';

describe('generateStableHash', () => {
  it('should generate a hash of the configured length', () => {
    const hash = generateStableHash('photo_packs/nature', 'john_doe');
    expect(hash).toHaveLength(ID_CONFIG.HASH_LENGTH);
  });

  it('should generate consistent hashes for the same input', () => {
    const hash1 = generateStableHash('photo_packs/nature', 'john_doe');
    const hash2 = generateStableHash('photo_packs/nature', 'john_doe');
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different canonical paths', () => {
    const hash1 = generateStableHash('photo_packs/nature', 'john_doe');
    const hash2 = generateStableHash('photo_packs/cities', 'john_doe');
    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hashes for different authors', () => {
    const hash1 = generateStableHash('photo_packs/nature', 'john_doe');
    const hash2 = generateStableHash('photo_packs/nature', 'jane_smith');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle special characters in path and author', () => {
    const hash = generateStableHash('photo_packs/São_Paulo', 'author@email.com');
    expect(hash).toHaveLength(ID_CONFIG.HASH_LENGTH);
    expect(hash).toMatch(/^[a-f0-9]{12}$/);
  });
});

describe('generateSlug', () => {
  it('should convert name to lowercase', () => {
    const slug = generateSlug('Nature Photos');
    expect(slug).toBe('nature-photos');
  });

  it('should replace spaces with hyphens', () => {
    const slug = generateSlug('Beautiful Nature Landscapes');
    expect(slug).toBe('beautiful-nature-landscapes');
  });

  it('should remove special characters', () => {
    const slug = generateSlug('Photos! @ #$% Nature & More');
    expect(slug).toBe('photos-nature-more');
  });

  it('should handle multiple consecutive special characters', () => {
    const slug = generateSlug('Nature   ---   Photos');
    expect(slug).toBe('nature-photos');
  });

  it('should remove leading and trailing hyphens', () => {
    const slug = generateSlug('   Nature Photos   ');
    expect(slug).toBe('nature-photos');
  });

  it('should handle unicode characters', () => {
    const slug = generateSlug('São Paulo Photos');
    expect(slug).toBe('s-o-paulo-photos');
  });

  it('should handle numbers correctly', () => {
    const slug = generateSlug('Top 100 Photos 2024');
    expect(slug).toBe('top-100-photos-2024');
  });

  it('should handle empty string', () => {
    const slug = generateSlug('');
    expect(slug).toBe('');
  });
});

describe('generateSearchText', () => {
  it('should combine all relevant fields into search text', () => {
    const item: PhotoPackItem = {
      name: 'Nature Photos',
      description: 'Beautiful landscape photography',
      author: 'john_doe',
      icon_url: 'http://example.com/icon.png',
      photos: ['photo1.jpg', 'photo2.jpg']
    };
    const searchText = generateSearchText(item, 'photo_packs/nature', 'john_doe');
    
    expect(searchText).toContain('nature photos');
    expect(searchText).toContain('beautiful landscape photography');
    expect(searchText).toContain('john_doe');
    expect(searchText).toContain('photo_packs nature');
  });

  it('should convert to lowercase', () => {
    const item: PhotoPackItem = {
      name: 'NATURE PHOTOS',
      description: 'BEAUTIFUL LANDSCAPES',
      author: 'JOHN_DOE',
      icon_url: 'http://example.com/icon.png',
      photos: ['photo1.jpg']
    };
    const searchText = generateSearchText(item, 'photo_packs/nature', 'JOHN_DOE');
    
    expect(searchText).toBe(searchText.toLowerCase());
  });

  it('should include language if provided', () => {
    const item: PhotoPackItem = {
      name: 'Photos',
      description: 'Description',
      author: 'author',
      icon_url: 'http://example.com/icon.png',
      photos: ['photo1.jpg'],
      language: 'fr'
    };
    const searchText = generateSearchText(item, 'photo_packs/test', 'author');
    
    expect(searchText).toContain('fr');
  });

  it('should handle missing language', () => {
    const item: PhotoPackItem = {
      name: 'Photos',
      description: 'Description',
      author: 'author',
      icon_url: 'http://example.com/icon.png',
      photos: ['photo1.jpg']
    };
    const searchText = generateSearchText(item, 'photo_packs/test', 'author');
    
    expect(searchText).toBeTruthy();
  });

  it('should replace slashes in canonical path with spaces', () => {
    const item: PhotoPackItem = {
      name: 'Photos',
      description: 'Description',
      author: 'author',
      icon_url: 'http://example.com/icon.png',
      photos: ['photo1.jpg']
    };
    const searchText = generateSearchText(item, 'photo_packs/nature_photos', 'author');
    
    expect(searchText).toContain('photo_packs nature_photos');
    expect(searchText).not.toContain('photo_packs/nature_photos');
  });
});

describe('validateItem', () => {
  describe('photo_packs validation', () => {
    it('should pass validation for valid photo pack', () => {
      const item: PhotoPackItem = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
        photos: ['photo1.jpg', 'photo2.jpg'],
      };

      const result = validateItem(item, 'photo_packs', 'photo_packs/nature');
      expect(result.success).toBe(true);
    });

    it('should fail validation if name is missing', () => {
      const item = {
        description: 'Beautiful landscapes',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
        photos: ['photo1.jpg'],
      } as PhotoPackItem;

      const result = validateItem(item, 'photo_packs', 'photo_packs/nature');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('name');
      expect(result.error?.message).toContain('Missing required field');
    });

    it('should fail validation if description is missing', () => {
      const item = {
        name: 'Nature Photos',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
        photos: ['photo1.jpg'],
      } as PhotoPackItem;

      const result = validateItem(item, 'photo_packs', 'photo_packs/nature');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('description');
    });

    it('should fail validation if author is missing', () => {
      const item = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        icon_url: 'http://example.com/icon.png',
        photos: ['photo1.jpg'],
      } as PhotoPackItem;

      const result = validateItem(item, 'photo_packs', 'photo_packs/nature');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('author');
    });

    it('should fail validation if icon_url is missing', () => {
      const item = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        author: 'john_doe',
        photos: ['photo1.jpg'],
      } as PhotoPackItem;

      const result = validateItem(item, 'photo_packs', 'photo_packs/nature');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('icon_url');
    });

    it('should fail validation if photos array is missing', () => {
      const item = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
      } as PhotoPackItem;

      const result = validateItem(item, 'photo_packs', 'photo_packs/nature');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('photos');
    });

    it('should fail validation if photos array is empty', () => {
      const item: PhotoPackItem = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
        photos: [],
      };

      const result = validateItem(item, 'photo_packs', 'photo_packs/nature');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('photos');
      expect(result.error?.message).toContain('at least one photo');
    });
  });

  describe('quote_packs validation', () => {
    it('should pass validation for valid quote pack', () => {
      const item: QuotePackItem = {
        name: 'Inspirational Quotes',
        description: 'Motivational quotes',
        author: 'jane_smith',
        quotes: [
          { quote: 'Be yourself', author: 'Oscar Wilde' },
          { quote: 'Keep going' },
        ],
      };

      const result = validateItem(
        item,
        'quote_packs',
        'quote_packs/inspirational'
      );
      expect(result.success).toBe(true);
    });

    it('should fail validation if quotes array is missing', () => {
      const item = {
        name: 'Quotes',
        description: 'Some quotes',
        author: 'author',
      } as QuotePackItem;

      const result = validateItem(item, 'quote_packs', 'quote_packs/test');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('quotes');
    });

    it('should fail validation if quotes array is empty', () => {
      const item: QuotePackItem = {
        name: 'Quotes',
        description: 'Some quotes',
        author: 'author',
        quotes: [],
      };

      const result = validateItem(item, 'quote_packs', 'quote_packs/test');
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('quotes');
      expect(result.error?.message).toContain('at least one quote');
    });
  });

  describe('preset_settings validation', () => {
    it('should pass validation for valid preset settings', () => {
      const item: PresetSettingsItem = {
        name: 'Dark Theme',
        description: 'A dark color scheme',
        author: 'designer',
        settings: {
          theme: 'dark',
          fontSize: 14,
        },
      };

      const result = validateItem(
        item,
        'preset_settings',
        'preset_settings/dark'
      );
      expect(result.success).toBe(true);
    });

    it('should fail validation if settings object is missing', () => {
      const item = {
        name: 'Settings',
        description: 'Some settings',
        author: 'author',
      } as PresetSettingsItem;

      const result = validateItem(
        item,
        'preset_settings',
        'preset_settings/test'
      );
      expect(result.success).toBe(false);
      expect(result.error?.field).toBe('settings');
    });

    it('should pass validation with empty settings object', () => {
      const item: PresetSettingsItem = {
        name: 'Settings',
        description: 'Some settings',
        author: 'author',
        settings: {},
      };

      const result = validateItem(
        item,
        'preset_settings',
        'preset_settings/test'
      );
      expect(result.success).toBe(true);
    });
  });
});

describe('formatValidationError', () => {
  it('should format error with field name', () => {
    const formatted = formatValidationError({
      field: 'name',
      message: 'Missing required field "name"',
      canonicalPath: 'photo_packs/nature',
    });

    expect(formatted).toContain('VALIDATION ERROR');
    expect(formatted).toContain('photo_packs/nature');
    expect(formatted).toContain('Missing required field');
    expect(formatted).toContain('field: name');
  });

  it('should format error without field name', () => {
    const formatted = formatValidationError({
      message: 'Invalid item',
      canonicalPath: 'photo_packs/nature',
    });

    expect(formatted).toContain('VALIDATION ERROR');
    expect(formatted).toContain('photo_packs/nature');
    expect(formatted).toContain('Invalid item');
    expect(formatted).not.toContain('field:');
  });
});

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
