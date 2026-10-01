import test from 'node:test';
import assert from 'node:assert/strict';
import { detectWatermarkFFT } from '../src/watermark-detect.js';

test('small image files never produce NaN or a watermark claim', () => {
    for (const length of [0, 1, 500, 1000, 1023]) {
        const result = detectWatermarkFFT(new Uint8Array(length));
        assert.equal(result.applicable, false);
        assert.equal(result.suspicious, false);
        for (const key of ['score', 'highFreqRatio', 'midFreqPeaks', 'lsbBias']) {
            assert.equal(Number.isFinite(result[key]), true);
        }
    }
});
