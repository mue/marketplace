import { describe, it, expect } from 'vitest';

import { generateSlug } from '../../scripts/utils.js';

describe('generateSlug', () => {
  it('should convert name to lowercase', () => {
    expect(generateSlug('Nature Photos')).toBe('nature-photos');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('Beautiful Nature Landscapes')).toBe('beautiful-nature-landscapes');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Photos! @ #$% Nature & More')).toBe('photos-nature-more');
  });

  it('should collapse multiple consecutive special characters', () => {
    expect(generateSlug('Nature   ---   Photos')).toBe('nature-photos');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('   Nature Photos   ')).toBe('nature-photos');
  });

  it('should handle unicode characters', () => {
    expect(generateSlug('São Paulo Photos')).toBe('s-o-paulo-photos');
  });

  it('should handle numbers correctly', () => {
    expect(generateSlug('Top 100 Photos 2024')).toBe('top-100-photos-2024');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});
