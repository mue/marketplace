import { describe, it, expect } from 'vitest';

import { validateItem } from '../../scripts/utils.js';
import type { PhotoPackItem, QuotePackItem, PresetSettingsItem } from '../../scripts/types.js';

// photo packs
describe('validateItem: photo_packs', () => {
  it('should pass for a valid photo pack', () => {
    const item: PhotoPackItem = {
      name: 'Nature Photos',
      description: 'Beautiful landscapes',
      author: 'john_doe',
      icon_url: 'http://example.com/icon.png',
      photos: ['photo1.jpg', 'photo2.jpg'],
    };

    expect(validateItem(item, 'photo_packs', 'photo_packs/nature').success).toBe(true);
  });

  it('should fail if name is missing', () => {
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

  it('should fail if description is missing', () => {
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

  it('should fail if author is missing', () => {
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

  it('should fail if icon_url is missing', () => {
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

  it('should fail if photos array is missing', () => {
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

  it('should fail if photos array is empty (non-api pack)', () => {
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
    expect(result.error?.message).toContain('api_enabled');
  });
});

// API photo packs
describe('validateItem: photo_packs (api_enabled)', () => {
  const baseApiPack: PhotoPackItem = {
    name: 'API Photos',
    description: 'Dynamic photos from an API',
    author: 'api_author',
    icon_url: 'http://example.com/icon.png',
    photos: [],
    api_enabled: true,
    api_provider: 'unsplash',
    api_endpoint: 'https://api.example.com/photos',
    settings_schema: [{ key: 'count', type: 'slider', label: 'Count', default: 10 }],
  };

  it('should pass for api_enabled pack with empty photos array', () => {
    expect(validateItem(baseApiPack, 'photo_packs', 'photo_packs/api').success).toBe(true);
  });

  it('should pass for api_enabled pack that also has static photos', () => {
    const item = { ...baseApiPack, photos: ['https://example.com/photo.jpg'] };

    expect(validateItem(item, 'photo_packs', 'photo_packs/api').success).toBe(true);
  });

  it('should fail if api_provider is missing', () => {
    const { api_provider, ...item } = baseApiPack;
    const result = validateItem(item as PhotoPackItem, 'photo_packs', 'photo_packs/api');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('api_provider');
  });

  it('should fail if api_endpoint is missing', () => {
    const { api_endpoint, ...item } = baseApiPack;
    const result = validateItem(item as PhotoPackItem, 'photo_packs', 'photo_packs/api');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('api_endpoint');
  });

  it('should fail if settings_schema is missing', () => {
    const { settings_schema, ...item } = baseApiPack;
    const result = validateItem(item as PhotoPackItem, 'photo_packs', 'photo_packs/api');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('settings_schema');
  });

  it('should fail if settings_schema is an empty array', () => {
    const item = { ...baseApiPack, settings_schema: [] };
    const result = validateItem(item, 'photo_packs', 'photo_packs/api');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('settings_schema');
  });

  it('should not apply api_enabled logic to quote_packs', () => {
    const item = {
      name: 'Quotes',
      description: 'Some quotes',
      author: 'author',
      quotes: [{ quote: 'Hello' }],
      api_enabled: true,
    } as unknown as QuotePackItem;

    expect(validateItem(item, 'quote_packs', 'quote_packs/test').success).toBe(true);
  });
});

// quotes
describe('validateItem: quote_packs', () => {
  it('should pass for a valid quote pack', () => {
    const item: QuotePackItem = {
      name: 'Inspirational Quotes',
      description: 'Motivational quotes',
      author: 'jane_smith',
      quotes: [{ quote: 'Be yourself', author: 'Oscar Wilde' }, { quote: 'Keep going' }],
    };

    expect(validateItem(item, 'quote_packs', 'quote_packs/inspirational').success).toBe(true);
  });

  it('should fail if name is missing', () => {
    const item = {
      description: 'Some quotes',
      author: 'author',
      quotes: [{ quote: 'Hello' }],
    } as QuotePackItem;

    const result = validateItem(item, 'quote_packs', 'quote_packs/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('name');
  });

  it('should fail if description is missing', () => {
    const item = {
      name: 'Quotes',
      author: 'author',
      quotes: [{ quote: 'Hello' }],
    } as QuotePackItem;

    const result = validateItem(item, 'quote_packs', 'quote_packs/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('description');
  });

  it('should fail if author is missing', () => {
    const item = {
      name: 'Quotes',
      description: 'Some quotes',
      quotes: [{ quote: 'Hello' }],
    } as QuotePackItem;

    const result = validateItem(item, 'quote_packs', 'quote_packs/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('author');
  });

  it('should fail if quotes array is missing', () => {
    const item = { name: 'Quotes', description: 'Some quotes', author: 'author' } as QuotePackItem;
    const result = validateItem(item, 'quote_packs', 'quote_packs/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('quotes');
  });

  it('should fail if quotes array is empty', () => {
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

// preset settings
describe('validateItem: preset_settings', () => {
  it('should pass for valid preset settings', () => {
    const item: PresetSettingsItem = {
      name: 'Dark Theme',
      description: 'A dark color scheme',
      author: 'designer',
      settings: { theme: 'dark', fontSize: 14 },
    };

    expect(validateItem(item, 'preset_settings', 'preset_settings/dark').success).toBe(true);
  });

  it('should pass with an empty settings object', () => {
    const item: PresetSettingsItem = {
      name: 'Settings',
      description: 'Some settings',
      author: 'author',
      settings: {},
    };

    expect(validateItem(item, 'preset_settings', 'preset_settings/test').success).toBe(true);
  });

  it('should fail if name is missing', () => {
    const item = {
      description: 'Some settings',
      author: 'author',
      settings: { theme: 'dark' },
    } as unknown as PresetSettingsItem;

    const result = validateItem(item, 'preset_settings', 'preset_settings/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('name');
  });

  it('should fail if description is missing', () => {
    const item = {
      name: 'Settings',
      author: 'author',
      settings: { theme: 'dark' },
    } as unknown as PresetSettingsItem;

    const result = validateItem(item, 'preset_settings', 'preset_settings/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('description');
  });

  it('should fail if author is missing', () => {
    const item = {
      name: 'Settings',
      description: 'Some settings',
      settings: { theme: 'dark' },
    } as unknown as PresetSettingsItem;

    const result = validateItem(item, 'preset_settings', 'preset_settings/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('author');
  });

  it('should fail if settings object is missing', () => {
    const item = {
      name: 'Settings',
      description: 'Some settings',
      author: 'author',
    } as PresetSettingsItem;

    const result = validateItem(item, 'preset_settings', 'preset_settings/test');

    expect(result.success).toBe(false);
    expect(result.error?.field).toBe('settings');
  });
});
