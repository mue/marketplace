import { describe, it, expect } from 'vitest';
import {
  generateStableHash,
  generateSlug,
  generateSearchText,
} from '../scripts/utils.js';
import type { PhotoPackItem, QuotePackItem } from '../scripts/types.js';

describe('Integration Tests', () => {
  describe('Full Photo Pack Processing', () => {
    it('should process a complete photo pack item', () => {
      const photopack: PhotoPackItem = {
        name: 'Beautiful European Cities',
        description:
          'Stunning photographs of historic European cities including Paris, Rome, and Barcelona',
        author: 'travel_photographer',
        icon_url: 'https://example.com/icons/europe.jpg',
        photos: [
          'https://example.com/paris1.jpg',
          'https://example.com/rome1.jpg',
          'https://example.com/barcelona1.jpg',
        ],
        language: 'en',
      };

      const canonicalPath = 'photo_packs/european_cities';

      // Generate all metadata
      const hash = generateStableHash(canonicalPath, photopack.author);
      const slug = generateSlug(photopack.name);
      const searchText = generateSearchText(
        photopack,
        canonicalPath,
        photopack.author
      );

      // Assertions
      expect(hash).toHaveLength(12);
      expect(hash).toMatch(/^[a-f0-9]{12}$/);

      expect(slug).toBe('beautiful-european-cities');

      expect(searchText).toContain('beautiful european cities');
      expect(searchText).toContain('paris');
      expect(searchText).toContain('rome');
      expect(searchText).toContain('barcelona');
      expect(searchText).toContain('travel_photographer');
    });
  });

  describe('Full Quote Pack Processing', () => {
    it('should process a complete quote pack item', () => {
      const quotepack: QuotePackItem = {
        name: 'Motivational Quotes',
        description: 'Inspiring quotes to keep you motivated and focused on your goals',
        author: 'quote_curator',
        quotes: [
          {
            quote: 'Success is not final, failure is not fatal',
            author: 'Winston Churchill',
          },
          {
            quote: 'The only way to do great work is to love what you do',
            author: 'Steve Jobs',
          },
          {
            quote: "Believe you can and you're halfway there",
            author: 'Theodore Roosevelt',
          },
        ],
        language: 'en',
      };

      const canonicalPath = 'quote_packs/motivational';

      // Generate all metadata
      const hash = generateStableHash(canonicalPath, quotepack.author);
      const slug = generateSlug(quotepack.name);
      const searchText = generateSearchText(
        quotepack,
        canonicalPath,
        quotepack.author
      );

      // Assertions
      expect(hash).toHaveLength(12);

      expect(slug).toBe('motivational-quotes');

      expect(searchText).toContain('motivational quotes');
      expect(searchText).toContain('inspiring');
      expect(searchText).toContain('quote_curator');
    });
  });

  describe('Hash Collision Prevention', () => {
    it('should generate unique hashes for items with similar names', () => {
      const paths = [
        'photo_packs/nature',
        'photo_packs/nature_photography',
        'photo_packs/natural_landscapes',
        'quote_packs/nature',
        'preset_settings/nature_theme'
      ];

      const hashes = paths.map(path => 
        generateStableHash(path, 'same_author')
      );

      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(paths.length);
    });

    it('should generate different hashes for same path with different authors', () => {
      const authors = [
        'author1',
        'author2',
        'author3',
        'author_with_underscores',
        'author-with-dashes'
      ];

      const hashes = authors.map(author => 
        generateStableHash('photo_packs/nature', author)
      );

      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(authors.length);
    });
  });

  describe('Slug Generation Edge Cases', () => {
    it('should handle complex real-world names', () => {
      const testCases = [
        { input: 'São Paulo Night Photography', expected: 's-o-paulo-night-photography' },
        { input: '2024 Top 100 Photos', expected: '2024-top-100-photos' },
        { input: 'Photos: Cities & Nature!', expected: 'photos-cities-nature' },
        { input: 'N.S.F.W. Content Warning', expected: 'n-s-f-w-content-warning' },
        { input: '   Spaces   Everywhere   ', expected: 'spaces-everywhere' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(generateSlug(input)).toBe(expected);
      });
    });
  });

  describe('Search Text Completeness', () => {
    it('should make all important item data searchable', () => {
      const item: PhotoPackItem = {
        name: 'Anime Characters',
        description: 'Popular anime character illustrations',
        author: 'anime_artist_2024',
        icon_url: 'https://example.com/icon.png',
        photos: ['photo1.jpg'],
        language: 'ja'
      };

      const searchText = generateSearchText(
        item,
        'photo_packs/anime_characters',
        'anime_artist_2024'
      );

      // All key information should be searchable
      expect(searchText).toContain('anime');
      expect(searchText).toContain('characters');
      expect(searchText).toContain('popular');
      expect(searchText).toContain('illustrations');
      expect(searchText).toContain('anime_artist_2024');
      expect(searchText).toContain('photo_packs');
      expect(searchText).toContain('ja');
    });
  });

  describe('Deterministic Behavior', () => {
    it('should always produce the same hash for the same input', () => {
      const results = Array(100)
        .fill(null)
        .map(() => generateStableHash('photo_packs/test', 'author'));

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
    });

    it('should always produce the same slug for the same input', () => {
      const results = Array(100)
        .fill(null)
        .map(() => generateSlug('Test Photo Pack Name'));

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
      expect(results[0]).toBe('test-photo-pack-name');
    });
  });

  describe('Cross-Function Integration', () => {
    it('should create consistent metadata across multiple runs', () => {
      const item: PhotoPackItem = {
        name: 'Test Pack',
        description: 'Test description with keywords',
        author: 'test_author',
        icon_url: 'https://example.com/icon.png',
        photos: ['photo1.jpg'],
      };

      const canonicalPath = 'photo_packs/test_pack';

      // Run the full metadata generation process multiple times
      const runs = Array(10)
        .fill(null)
        .map(() => ({
          hash: generateStableHash(canonicalPath, item.author),
          slug: generateSlug(item.name),
          searchText: generateSearchText(item, canonicalPath, item.author),
        }));

      // All runs should produce identical results
      runs.forEach((run, index) => {
        if (index > 0) {
          expect(run.hash).toBe(runs[0].hash);
          expect(run.slug).toBe(runs[0].slug);
          expect(run.searchText).toBe(runs[0].searchText);
        }
      });
    });
  });
});
