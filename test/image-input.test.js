import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveImageMime } from '../src/utils.js';

test('image MIME accepts supported declarations and falls back to file extensions', () => {
    assert.equal(resolveImageMime({ name: 'photo.bin', type: 'image/png' }), 'image/png');
    assert.equal(resolveImageMime({ name: 'PHOTO.JPEG', type: '' }), 'image/jpeg');
    assert.equal(resolveImageMime({ name: 'asset.webp' }), 'image/webp');
    assert.equal(resolveImageMime({ name: 'notes.txt', type: '' }), null);
});
