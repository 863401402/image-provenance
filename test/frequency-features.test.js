import test from 'node:test';
import assert from 'node:assert/strict';

import { extractFeatures } from '../src/frequency/features.js';
import { scoreFeatures } from '../src/frequency/score.js';

function patternedPixels(width, height) {
    const gray = new Float32Array(width * height);
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const value = (x * 17 + y * 29 + (x * y) % 53) % 256;
            const i = y * width + x;
            gray[i] = value;
            rgba[i * 4] = value;
            rgba[i * 4 + 1] = (value + x * 3) % 256;
            rgba[i * 4 + 2] = (value + y * 5) % 256;
            rgba[i * 4 + 3] = 255;
        }
    }
    return { rgba, gray };
}

test('spectral ratios and normalized entropy stay within probability bounds', () => {
    const { rgba, gray } = patternedPixels(32, 32);
    const { features } = extractFeatures(rgba, gray, 32, 32);
    const major = [
        features.f01_low_freq_ratio,
        features.f02_mid_freq_ratio,
        features.f03_high_freq_ratio,
    ];
    const fine = Object.entries(features)
        .filter(([name]) => /^f(?:09|1[0-5])_band_/.test(name))
        .map(([, value]) => value);

    for (const value of [...major, ...fine, features.f06_spectral_entropy]) {
        assert.ok(value >= 0 && value <= 1, `out-of-range spectral value: ${value}`);
    }
    assert.ok(Math.abs(major.reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
    assert.ok(Math.abs(fine.reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
});

test('all extracted features are finite and DCT kurtosis is computed', () => {
    const { rgba, gray } = patternedPixels(32, 32);
    const { features } = extractFeatures(rgba, gray, 32, 32);

    for (const [name, value] of Object.entries(features)) {
        assert.ok(Number.isFinite(value), `${name} is not finite`);
    }
    assert.notEqual(features.f55_dct_coef_kurt, 0);
});

test('centrosymmetry is a transform invariant, not AI evidence', () => {
    const neutral = {
        f04_spectral_slope: -2,
        f05_spectral_flatness: 0.1,
        f18_radial_symmetry: 1,
        f21_orientation_strength: 2,
        f22_phase_consistency_r: 0,
        f23_phase_consistency_g: 0,
        f24_phase_consistency_b: 0,
        f26_cross_color_phase_corr: 0,
        f27_lsb0_bias_r: 0,
        f28_lsb0_bias_g: 0,
        f29_lsb0_bias_b: 0,
        f36_pixel_kurt_r: 1,
        f36b_pixel_kurt_g: 1,
        f36c_pixel_kurt_b: 1,
        f37_rg_correlation: 0.9,
        f38_rb_correlation: 0.9,
        f39_gb_correlation: 0.9,
        f40_horz_corr: 0.9,
        f41_vert_corr: 0.9,
        f50_wavelet_hh_ratio: 0.1,
        f57_dct_block_variance: 1000,
    };

    const score = scoreFeatures(neutral);
    assert.equal(score.votes.some(vote => vote.reason.includes('对称')), false);
    assert.equal(score.total, 0);

    const singleFamily = scoreFeatures({
        ...neutral,
        f04_spectral_slope: 0,
        f05_spectral_flatness: 0.5,
    });
    assert.equal(singleFamily.total, 4);
    assert.deepEqual(singleFamily.positiveFamilies, ['spectral']);
    assert.equal(singleFamily.confidence, 'weak');
});
