import { describe, it, expect } from 'vitest';

import { formatValidationError } from '../../scripts/utils.js';

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
