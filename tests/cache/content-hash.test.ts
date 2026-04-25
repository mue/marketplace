import { describe, it, expect } from 'vitest';

import { computeContentHash } from '../../scripts/cache.js';

describe('computeContentHash', () => {
  it('should return a 64-character hex string', () => {
    expect(computeContentHash('hello')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be deterministic for the same input', () => {
    expect(computeContentHash('test')).toBe(computeContentHash('test'));
  });

  it('should produce different hashes for different content', () => {
    expect(computeContentHash('a')).not.toBe(computeContentHash('b'));
  });

  it('should accept a Buffer', () => {
    expect(computeContentHash(Buffer.from('hello'))).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce the same hash for a string and its equivalent Buffer', () => {
    expect(computeContentHash('hello')).toBe(computeContentHash(Buffer.from('hello')));
  });

  it('should produce different hashes for different strings', () => {
    const hashes = new Set(['', 'a', 'ab', 'abc', '{"key":"value"}'].map(computeContentHash));
    expect(hashes.size).toBe(5);
  });
});
