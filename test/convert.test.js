import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MAX_IMAGE_DIMENSION,
    MAX_IMAGE_PIXELS,
    normalizeBackgroundColor,
    normalizeJpegQuality,
    stripC2paPng,
    validateImageDimensions,
} from '../src/convert.js';

test('JPEG quality defaults and clamps to the Canvas range', () => {
    assert.equal(normalizeJpegQuality(undefined), 0.92);
    assert.equal(normalizeJpegQuality(Number.NaN), 0.92);
    assert.equal(normalizeJpegQuality(-1), 0);
    assert.equal(normalizeJpegQuality(0.87), 0.87);
    assert.equal(normalizeJpegQuality(2), 1);
});

test('JPEG background is restricted to explicit white or black', () => {
    assert.equal(normalizeBackgroundColor(undefined), '#ffffff');
    assert.equal(normalizeBackgroundColor('red'), '#ffffff');
    assert.equal(normalizeBackgroundColor('#000000'), '#000000');
});

test('image dimension guard accepts normal photos and rejects unsafe canvases', () => {
    assert.doesNotThrow(() => validateImageDimensions(8064, 6048));
    assert.throws(() => validateImageDimensions(0, 100), /invalid/i);
    assert.throws(() => validateImageDimensions(MAX_IMAGE_DIMENSION + 1, 1), /exceed/i);
    assert.throws(() => validateImageDimensions(10_000, Math.ceil(MAX_IMAGE_PIXELS / 10_000) + 1), /safety limit/i);
});

test('truncated PNG input is preserved rather than misidentified as C2PA', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]);
    const result = stripC2paPng(bytes);
    assert.equal(result.removed, 0);
    assert.deepEqual(result.bytes, bytes);
});
