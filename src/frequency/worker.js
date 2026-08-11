// Web Worker entry — off-main-thread frequency analysis.
// Message contract:
//   { type: 'analyze', rgba, gray, w, h }  →
//     { type: 'progress', stage, pct }
//     { type: 'result', features, viz, score, timing }

import { extractFeatures } from './features.js';
import { scoreFeatures } from './score.js';
import { downsampleMag, radialSpectrum, magnitudeShifted } from './transforms.js';
import { assessPixelSuitability } from './suitability.js';

self.onmessage = (e) => {
    const { type } = e.data;
    if (type !== 'analyze') return;
    try {
        const { rgba, gray, w, h } = e.data;
        const timing = {};

        const t0 = performance.now();
        self.postMessage({ type: 'progress', stage: 'features', pct: 5 });
        const { features, viz } = extractFeatures(rgba, gray, w, h);
        timing.features = performance.now() - t0;

        const suitability = assessPixelSuitability(rgba, gray, w, h);

        self.postMessage({ type: 'progress', stage: 'score', pct: 85 });
        const score = { ...scoreFeatures(features), applicable: suitability.suitable };
        timing.score = performance.now() - t0 - timing.features;

        // Build small transferable viz payloads (don't ship full 1024² FFT back).
        self.postMessage({ type: 'progress', stage: 'viz', pct: 92 });
        const vizOut = {
            fftMag128: downsampleMag(viz.mag, w, h, 128, 128),
            radial64: viz.radial.slice(0),
            phaseConsistency: {
                r: features.f22_phase_consistency_r,
                g: features.f23_phase_consistency_g,
                b: features.f24_phase_consistency_b,
            },
            waveletEnergies: {
                LL2: features.f47_wavelet_ll2_energy,
                HH1: features.f45_wavelet_hh1_energy,
                HH2: features.f46_wavelet_hh2_energy,
                LH1_ratio: features.f48_wavelet_lh_ratio,
                HL1_ratio: features.f49_wavelet_hl_ratio,
                HH1_ratio: features.f50_wavelet_hh_ratio,
            },
        };

        self.postMessage({
            type: 'result', features, viz: vizOut, score, timing, suitability,
        }, [vizOut.fftMag128.buffer, vizOut.radial64.buffer]);
    } catch (err) {
        self.postMessage({ type: 'error', message: err?.message || String(err), stack: err?.stack });
    }
};
