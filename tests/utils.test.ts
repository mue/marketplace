import { describe, it, expect } from 'vitest';
import {
  generateStableHash,
  generateSlug,
  extractTags,
  generateSearchText,
  validateItem,
  REQUIRED_FIELDS
} from '../scripts/utils.js';
import type { PhotoPackItem, QuotePackItem, PresetSettingsItem } from '../scripts/types.js';

describe('generateStableHash', () => {
  it('should generate a 12-character hash', () => {
    const hash = generateStableHash('photo_packs/nature', 'john_doe');
    expect(hash).toHaveLength(12);
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
    expect(hash).toHaveLength(12);
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

describe('extractTags', () => {
  it('should extract meaningful words from name and description', () => {
    const tags = extractTags(
      'Nature Photography',
      'Beautiful landscape photos from around the world'
    );
    expect(tags).toContain('nature');
    expect(tags).toContain('photography');
    expect(tags).toContain('beautiful');
    expect(tags).toContain('landscape');
    expect(tags).toContain('photos');
    expect(tags).toContain('world');
  });

  it('should filter out common words', () => {
    const tags = extractTags(
      'The Best Photos',
      'These are the most beautiful photos in the world'
    );
    expect(tags).not.toContain('the');
    expect(tags).not.toContain('are');
    expect(tags).not.toContain('in');
  });

  it('should filter out words shorter than 3 characters', () => {
    const tags = extractTags('AI ML Photos', 'AI and ML in photography');
    expect(tags).not.toContain('ai');
    expect(tags).not.toContain('ml');
  });

  it('should return maximum 10 tags', () => {
    const tags = extractTags(
      'One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve',
      'Testing maximum tag limit with many words here'
    );
    expect(tags.length).toBeLessThanOrEqual(10);
  });

  it('should prioritize frequently occurring words', () => {
    const tags = extractTags(
      'Nature nature nature',
      'Beautiful nature photos. Nature is amazing. Love nature.'
    );
    expect(tags[0]).toBe('nature');
  });

  it('should convert to lowercase', () => {
    const tags = extractTags('NATURE', 'BEAUTIFUL PHOTOS');
    expect(tags).toContain('nature');
    expect(tags).toContain('beautiful');
    expect(tags).toContain('photos');
  });

  it('should handle special characters', () => {
    const tags = extractTags('Nature!!!', 'Photos@#$% Beautiful');
    expect(tags).toContain('nature');
    expect(tags).toContain('photos');
    expect(tags).toContain('beautiful');
  });

  it('should handle empty input', () => {
    const tags = extractTags('', '');
    expect(tags).toEqual([]);
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
        photos: ['photo1.jpg', 'photo2.jpg']
      };
      
      expect(() => validateItem(item, 'photo_packs', 'photo_packs/nature')).not.toThrow();
    });

    it('should throw error if name is missing', () => {
      const item = {
        description: 'Beautiful landscapes',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
        photos: ['photo1.jpg']
      } as PhotoPackItem;
      
      expect(() => validateItem(item, 'photo_packs', 'photo_packs/nature')).toThrow(
        /missing required field "name"/
      );
    });

    it('should throw error if description is missing', () => {
      const item = {
        name: 'Nature Photos',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
        photos: ['photo1.jpg']
      } as PhotoPackItem;
      
      expect(() => validateItem(item, 'photo_packs', 'photo_packs/nature')).toThrow(
        /missing required field "description"/
      );
    });

    it('should throw error if author is missing', () => {
      const item = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        icon_url: 'http://example.com/icon.png',
        photos: ['photo1.jpg']
      } as PhotoPackItem;
      
      expect(() => validateItem(item, 'photo_packs', 'photo_packs/nature')).toThrow(
        /missing required field "author"/
      );
    });

    it('should throw error if icon_url is missing', () => {
      const item = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        author: 'john_doe',
        photos: ['photo1.jpg']
      } as PhotoPackItem;
      
      expect(() => validateItem(item, 'photo_packs', 'photo_packs/nature')).toThrow(
        /missing required field "icon_url"/
      );
    });

    it('should throw error if photos array is missing', () => {
      const item = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png'
      } as PhotoPackItem;
      
      expect(() => validateItem(item, 'photo_packs', 'photo_packs/nature')).toThrow(
        /missing required field "photos"/
      );
    });

    it('should throw error if photos array is empty', () => {
      const item: PhotoPackItem = {
        name: 'Nature Photos',
        description: 'Beautiful landscapes',
        author: 'john_doe',
        icon_url: 'http://example.com/icon.png',
        photos: []
      };
      
      expect(() => validateItem(item, 'photo_packs', 'photo_packs/nature')).toThrow(
        /has no photos/
      );
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
          { quote: 'Keep going' }
        ]
      };
      
      expect(() => validateItem(item, 'quote_packs', 'quote_packs/inspirational')).not.toThrow();
    });

    it('should throw error if quotes array is missing', () => {
      const item = {
        name: 'Quotes',
        description: 'Some quotes',
        author: 'author'
      } as QuotePackItem;
      
      expect(() => validateItem(item, 'quote_packs', 'quote_packs/test')).toThrow(
        /missing required field "quotes"/
      );
    });

    it('should throw error if quotes array is empty', () => {
      const item: QuotePackItem = {
        name: 'Quotes',
        description: 'Some quotes',
        author: 'author',
        quotes: []
      };
      
      expect(() => validateItem(item, 'quote_packs', 'quote_packs/test')).toThrow(
        /has no quotes/
      );
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
          fontSize: 14
        }
      };
      
      expect(() => validateItem(item, 'preset_settings', 'preset_settings/dark')).not.toThrow();
    });

    it('should throw error if settings object is missing', () => {
      const item = {
        name: 'Settings',
        description: 'Some settings',
        author: 'author'
      } as PresetSettingsItem;
      
      expect(() => validateItem(item, 'preset_settings', 'preset_settings/test')).toThrow(
        /missing required field "settings"/
      );
    });

    it('should pass validation with empty settings object', () => {
      const item: PresetSettingsItem = {
        name: 'Settings',
        description: 'Some settings',
        author: 'author',
        settings: {}
      };
      
      expect(() => validateItem(item, 'preset_settings', 'preset_settings/test')).not.toThrow();
    });
  });
});

describe('REQUIRED_FIELDS', () => {
  it('should have correct required fields for photo_packs', () => {
    expect(REQUIRED_FIELDS.photo_packs).toEqual([
      'name',
      'description',
      'author',
      'icon_url',
      'photos'
    ]);
  });

  it('should have correct required fields for quote_packs', () => {
    expect(REQUIRED_FIELDS.quote_packs).toEqual([
      'name',
      'description',
      'author',
      'quotes'
    ]);
  });

  it('should have correct required fields for preset_settings', () => {
    expect(REQUIRED_FIELDS.preset_settings).toEqual([
      'name',
      'description',
      'author',
      'settings'
    ]);
  });
});
