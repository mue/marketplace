import { describe, it, expect } from 'vitest';
import { generateSearchText } from '../../scripts/utils.js';
import type { PhotoPackItem } from '../../scripts/types.js';

const baseItem: PhotoPackItem = {
  name: 'Photos',
  description: 'Description',
  author: 'author',
  icon_url: 'http://example.com/icon.png',
  photos: ['photo1.jpg'],
};

describe('generateSearchText', () => {
  it('should combine all relevant fields into search text', () => {
    const item: PhotoPackItem = {
      name: 'Nature Photos',
      description: 'Beautiful landscape photography',
      author: 'john_doe',
      icon_url: 'http://example.com/icon.png',
      photos: ['photo1.jpg', 'photo2.jpg'],
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
      photos: ['photo1.jpg'],
    };
    const searchText = generateSearchText(item, 'photo_packs/nature', 'JOHN_DOE');
    expect(searchText).toBe(searchText.toLowerCase());
  });

  it('should include language if provided', () => {
    const item = { ...baseItem, language: 'fr' };
    const searchText = generateSearchText(item, 'photo_packs/test', 'author');
    expect(searchText).toContain('fr');
  });

  it('should handle missing language', () => {
    const searchText = generateSearchText(baseItem, 'photo_packs/test', 'author');
    expect(searchText).toBeTruthy();
  });

  it('should replace the first slash in canonical path with a space', () => {
    const searchText = generateSearchText(baseItem, 'photo_packs/nature_photos', 'author');
    expect(searchText).toContain('photo_packs nature_photos');
    expect(searchText).not.toContain('photo_packs/nature_photos');
  });

  it('should only replace the first slash in canonical path', () => {
    // String.replace with a string literal only replaces the first occurrence.
    // This documents the current behaviour for paths with multiple slashes.
    const searchText = generateSearchText(baseItem, 'photo_packs/sub/item', 'author');
    expect(searchText).toContain('photo_packs sub/item');
  });
});
