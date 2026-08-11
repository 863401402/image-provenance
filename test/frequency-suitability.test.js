import test from 'node:test';
import assert from 'node:assert/strict';

import { assessPixelSuitability } from '../src/frequency/suitability.js';

function pixels(width, height, valueAt) {
    const gray = new Float32Array(width * height);
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const value = valueAt(x, y);
            const i = y * width + x;
            gray[i] = value;
            rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = value;
            rgba[i * 4 + 3] = 255;
        }
    }
    return { rgba, gray };
}

test('high-contrast binary grids are rejected as QR/document-like', () => {
    const { rgba, gray } = pixels(128, 128, (x, y) => ((x >> 2) + (y >> 2)) % 2 ? 255 : 0);
    const result = assessPixelSuitability(rgba, gray, 128, 128);
    assert.equal(result.suitable, false);
    assert.deepEqual(result.reasons, ['qrOrDocument']);
});

test('flat images are rejected as low texture', () => {
    const { rgba, gray } = pixels(128, 128, () => 128);
    const result = assessPixelSuitability(rgba, gray, 128, 128);
    assert.equal(result.suitable, false);
    assert.deepEqual(result.reasons, ['lowTexture']);
});

test('continuous photo-like variation remains eligible', () => {
    const { rgba, gray } = pixels(128, 128, (x, y) => (x * 13 + y * 7 + ((x * y) % 37)) % 256);
    const result = assessPixelSuitability(rgba, gray, 128, 128);
    assert.equal(result.suitable, true);
});
