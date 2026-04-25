import { describe, it, expect } from 'vitest';

import { generateStableHash } from '../../scripts/utils.js';
import { ID_CONFIG } from '../../scripts/config.js';

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
