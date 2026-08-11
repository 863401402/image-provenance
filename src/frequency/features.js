// 44+ frequency/pixel features — Worker-safe.
// Inputs:
//   rgba: Uint8ClampedArray(w*h*4) — RGBA pixels
//   gray: Float32Array(w*h)        — luminance 0..255
//   w, h: power-of-two (enforced upstream)
// Output: flat object { featureName: number, ... }

import { fft2d, magnitudeShifted, radialSpectrumStats, dct8, haar2d2level } from './transforms.js';

const safeLog = v => Math.log(Math.max(v, 1e-12));

function mean(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
}
function variance(arr, mu) {
    mu = mu ?? mean(arr);
    let s = 0;
    for (let i = 0; i < arr.length; i++) { const d = arr[i] - mu; s += d * d; }
    return s / arr.length;
}
function moments(arr) {
    const mu = mean(arr);
    let m2 = 0, m3 = 0, m4 = 0;
    for (let i = 0; i < arr.length; i++) {
        const d = arr[i] - mu;
        const d2 = d * d;
        m2 += d2; m3 += d2 * d; m4 += d2 * d2;
    }
    const n = arr.length;
    m2 /= n; m3 /= n; m4 /= n;
    const sd = Math.sqrt(m2);
    return { mean: mu, std: sd, skew: sd > 1e-9 ? m3 / (sd*sd*sd) : 0, kurt: m2 > 1e-9 ? m4 / (m2*m2) - 3 : 0 };
}
function corrCoef(a, b) {
    if (a.length !== b.length) return 0;
    const mA = mean(a), mB = mean(b);
    let num = 0, dA = 0, dB = 0;
    for (let i = 0; i < a.length; i++) {
        const da = a[i] - mA, db = b[i] - mB;
        num += da * db; dA += da * da; dB += db * db;
    }
    const den = Math.sqrt(dA * dB);
    return den > 1e-9 ? num / den : 0;
}

export function extractFeatures(rgba, gray, w, h) {
    const f = {};
    const N = w * h;

    // ===== Transforms =====
    const { re, im } = fft2d(gray, w, h);
    const mag = magnitudeShifted(re, im, w, h);
    const radialStats = radialSpectrumStats(mag, w, h, 64);
    const radial = radialStats.density;
    const radialPower = radialStats.power;

    // ===== §1 Spectral energy (1-8) =====
    const totalAC = radialPower.reduce((s, v, i) => i === 0 ? s : s + v, 0);
    const binAt = pct => Math.floor(pct * radial.length);
    const bandPower = (a, b) => {
        let sum = 0;
        for (let i = Math.max(1, a); i < Math.min(b, radial.length); i++) sum += radialPower[i];
        return sum;
    };
    const bandRatio = (a, b) => totalAC > 0 ? bandPower(a, b) / totalAC : 0;
    f.f01_low_freq_ratio = bandRatio(0, binAt(0.10));
    f.f02_mid_freq_ratio = bandRatio(binAt(0.10), binAt(0.40));
    f.f03_high_freq_ratio = bandRatio(binAt(0.40), radial.length);
    // Spectral slope: linear fit of log(power) vs log(freq) on log-log, skipping DC
    let sx = 0, sy = 0, sxx = 0, sxy = 0, nPts = 0;
    for (let i = 1; i < radial.length; i++) {
        if (radial[i] <= 0) continue;
        const lx = safeLog(i), ly = safeLog(radial[i]);
        sx += lx; sy += ly; sxx += lx * lx; sxy += lx * ly; nPts++;
    }
    f.f04_spectral_slope = nPts > 1 ? (nPts * sxy - sx * sy) / Math.max(nPts * sxx - sx * sx, 1e-9) : 0;
    // Spectral flatness = geo_mean / arith_mean
    let gm = 0, am = 0;
    for (let i = 1; i < radial.length; i++) { gm += safeLog(radial[i] + 1e-9); am += radial[i]; }
    gm = Math.exp(gm / (radial.length - 1));
    am /= (radial.length - 1);
    f.f05_spectral_flatness = am > 1e-9 ? gm / am : 0;
    // Spectral entropy
    const radialNorm = Float64Array.from(radialPower, (v, i) => i > 0 && totalAC > 0 ? v / totalAC : 0);
    let ent = 0;
    let activeBins = 0;
    for (let i = 1; i < radialNorm.length; i++) {
        const p = radialNorm[i];
        if (p > 0) { ent -= p * safeLog(p); activeBins++; }
    }
    f.f06_spectral_entropy = activeBins > 1 ? ent / Math.log(activeBins) : 0;
    f.f07_dc_component = mag[(h/2) * w + w/2];
    f.f08_ac_energy_total = totalAC;

    // ===== §2 Sub-band fine (9-15) =====
    const bands = [[0,0.05],[0.05,0.10],[0.10,0.20],[0.20,0.30],[0.30,0.50],[0.50,0.70],[0.70,1.0]];
    bands.forEach(([a,b], i) => {
        const number = String(9 + i).padStart(2, '0');
        f[`f${number}_band_${Math.round(a*100)}_${Math.round(b*100)}_ratio`] = bandRatio(binAt(a), binAt(b));
    });

    // ===== §3 Radial (16-18) =====
    f.f16_radial_energy_variance = variance(radialNorm.subarray(1));
    // Peak count: local maxima above rolling median*1.5
    let peaks = 0;
    for (let i = 2; i < radial.length - 2; i++) {
        if (radial[i] > radial[i-1] && radial[i] > radial[i+1] &&
            radial[i] > (radial[i-2] + radial[i+2]) * 0.75) peaks++;
    }
    f.f17_radial_peak_count = peaks;
    // Radial symmetry: compare opposite half-spectra
    let symNum = 0, symDen = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w/2; x++) {
            const mirrorY = (h - y) % h;
            const mirrorX = (w - x) % w;
            const a = mag[y*w + x], b = mag[mirrorY*w + mirrorX];
            symNum += Math.abs(a - b); symDen += a + b;
        }
    }
    f.f18_radial_symmetry = symDen > 1e-9 ? 1 - symNum / symDen : 1;

    // ===== §4 Angular (19-21) =====
    const nAng = 16;
    const angPower = new Float64Array(nAng);
    const cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = x - cx, dy = y - cy;
            if (dx === 0 && dy === 0) continue;
            const ang = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI); // 0..1
            const b = Math.min(nAng - 1, Math.floor(ang * nAng));
            angPower[b] += mag[y*w + x] * mag[y*w + x];
        }
    }
    f.f19_angular_energy_variance = variance(Array.from(angPower));
    let maxAng = 0, maxAngIdx = 0, sumAng = 0;
    for (let i = 0; i < nAng; i++) { sumAng += angPower[i]; if (angPower[i] > maxAng) { maxAng = angPower[i]; maxAngIdx = i; } }
    f.f20_dominant_orientation = (maxAngIdx / nAng) * 180;
    f.f21_orientation_strength = sumAng > 1e-9 ? maxAng / (sumAng / nAng) : 0;

    // ===== §5 Phase — per-channel FFT (22-26) =====
    const channel = (ch) => {
        const g = new Float32Array(N);
        for (let i = 0; i < N; i++) g[i] = rgba[i*4 + ch];
        return fft2d(g, w, h);
    };
    const phaseConsistency = (re, im) => {
        // Mean-resultant length of phase angles (ignoring DC).
        let sumCos = 0, sumSin = 0, n = 0;
        for (let i = 1; i < re.length; i++) {
            const mg = Math.sqrt(re[i]*re[i] + im[i]*im[i]);
            if (mg < 1) continue;
            sumCos += re[i] / mg; sumSin += im[i] / mg; n++;
        }
        return n > 0 ? Math.sqrt(sumCos*sumCos + sumSin*sumSin) / n : 0;
    };
    const rFFT = channel(0), gFFT = channel(1), bFFT = channel(2);
    f.f22_phase_consistency_r = phaseConsistency(rFFT.re, rFFT.im);
    f.f23_phase_consistency_g = phaseConsistency(gFFT.re, gFFT.im);
    f.f24_phase_consistency_b = phaseConsistency(bFFT.re, bFFT.im);
    // Phase noise: std of phase angles (lower = more structured watermark)
    const phaseStd = (re, im) => {
        const ang = [];
        for (let i = 1; i < re.length; i += 4) {
            const mg = Math.sqrt(re[i]*re[i] + im[i]*im[i]);
            if (mg < 1) continue;
            ang.push(Math.atan2(im[i], re[i]));
        }
        return ang.length > 1 ? Math.sqrt(variance(ang)) : 0;
    };
    f.f25_phase_noise_std = phaseStd(rFFT.re, rFFT.im);
    // Cross-color phase corr (R vs G angle)
    const angSample = (re, im, n) => {
        const out = new Float32Array(n); let k = 0;
        for (let i = 1; k < n && i < re.length; i += 8) out[k++] = Math.atan2(im[i], re[i]);
        return out.subarray(0, k);
    };
    const nSamp = Math.min(4096, N/8|0);
    f.f26_cross_color_phase_corr = corrCoef(angSample(rFFT.re, rFFT.im, nSamp), angSample(gFFT.re, gFFT.im, nSamp));

    // ===== §6 LSB (27-32) =====
    let lsb0 = [0,0,0], lsb1 = [0,0,0];
    for (let i = 0; i < N; i++) {
        const p = i*4;
        lsb0[0] += rgba[p]   & 1; lsb0[1] += rgba[p+1] & 1; lsb0[2] += rgba[p+2] & 1;
        lsb1[0] += (rgba[p]   >> 1) & 1; lsb1[1] += (rgba[p+1] >> 1) & 1; lsb1[2] += (rgba[p+2] >> 1) & 1;
    }
    f.f27_lsb0_bias_r = Math.abs(lsb0[0]/N - 0.5);
    f.f28_lsb0_bias_g = Math.abs(lsb0[1]/N - 0.5);
    f.f29_lsb0_bias_b = Math.abs(lsb0[2]/N - 0.5);
    f.f30_lsb1_bias = Math.abs((lsb1[0]+lsb1[1]+lsb1[2])/(3*N) - 0.5);
    // Correlation between adjacent pixels' LSBs
    let same = 0, total = 0;
    for (let i = 0; i < N - 1; i++) {
        const a = rgba[i*4] & 1, b = rgba[(i+1)*4] & 1;
        if (a === b) same++; total++;
    }
    f.f31_lsb_correlation = total > 0 ? same / total : 0;
    // Chi-square on byte histogram
    const hist = new Uint32Array(256);
    for (let i = 0; i < N; i++) hist[rgba[i*4]]++;
    const exp = N / 256;
    let chi = 0;
    for (let i = 0; i < 256; i++) { const d = hist[i] - exp; chi += d*d / exp; }
    f.f32_lsb_chi_square = chi;

    // ===== §7 Pixel stats (33-39) =====
    const rArr = new Float32Array(N), gArr = new Float32Array(N), bArr = new Float32Array(N);
    for (let i = 0; i < N; i++) { rArr[i] = rgba[i*4]; gArr[i] = rgba[i*4+1]; bArr[i] = rgba[i*4+2]; }
    const mR = moments(rArr), mG = moments(gArr), mB = moments(bArr);
    f.f33_pixel_mean_r = mR.mean; f.f33b_pixel_mean_g = mG.mean; f.f33c_pixel_mean_b = mB.mean;
    f.f34_pixel_std_r = mR.std; f.f34b_pixel_std_g = mG.std; f.f34c_pixel_std_b = mB.std;
    f.f35_pixel_skew_r = mR.skew; f.f35b_pixel_skew_g = mG.skew; f.f35c_pixel_skew_b = mB.skew;
    f.f36_pixel_kurt_r = mR.kurt; f.f36b_pixel_kurt_g = mG.kurt; f.f36c_pixel_kurt_b = mB.kurt;
    f.f37_rg_correlation = corrCoef(rArr, gArr);
    f.f38_rb_correlation = corrCoef(rArr, bArr);
    f.f39_gb_correlation = corrCoef(gArr, bArr);

    // ===== §8 Spatial correlation (40-44) =====
    const hShift = new Float32Array(N - 1), hBase = new Float32Array(N - 1);
    const vShift = new Float32Array((h-1) * w), vBase = new Float32Array((h-1) * w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) {
        hBase[y*(w-1) + x] = gray[y*w + x]; hShift[y*(w-1) + x] = gray[y*w + x + 1];
    }
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) {
        vBase[y*w + x] = gray[y*w + x]; vShift[y*w + x] = gray[(y+1)*w + x];
    }
    f.f40_horz_corr = corrCoef(hBase.subarray(0, (w-1)*h), hShift.subarray(0, (w-1)*h));
    f.f41_vert_corr = corrCoef(vBase, vShift);
    const diagBase = new Float32Array((h-1)*(w-1)), diagShift = new Float32Array((h-1)*(w-1));
    for (let y = 0; y < h-1; y++) for (let x = 0; x < w-1; x++) {
        diagBase[y*(w-1)+x] = gray[y*w+x]; diagShift[y*(w-1)+x] = gray[(y+1)*w + x + 1];
    }
    f.f42_diag_corr = corrCoef(diagBase, diagShift);
    // Correlation break in 2-bit / 4-bit planes
    const breakRatio = (bits) => {
        const mask = (1 << bits) - 1;
        let breaks = 0, n = 0;
        for (let i = 0; i < N - 1; i++) {
            const a = rgba[i*4] & mask, b = rgba[(i+1)*4] & mask;
            if (Math.abs(a - b) > (mask >> 1)) breaks++;
            n++;
        }
        return n ? breaks / n : 0;
    };
    f.f43_corr_break_ratio_2 = breakRatio(2);
    f.f44_corr_break_ratio_4 = breakRatio(4);

    // ===== §9 Haar wavelet (45-52) =====
    const wv = haar2d2level(gray, w, h);
    const e = a => a.reduce((s, v) => s + v*v, 0);
    const eLL2 = e(wv.LL2) || 1e-9;
    f.f45_wavelet_hh1_energy = e(wv.HH1);
    f.f46_wavelet_hh2_energy = e(wv.HH2);
    f.f47_wavelet_ll2_energy = eLL2;
    f.f48_wavelet_lh_ratio = e(wv.LH1) / eLL2;
    f.f49_wavelet_hl_ratio = e(wv.HL1) / eLL2;
    f.f50_wavelet_hh_ratio = f.f45_wavelet_hh1_energy / eLL2;
    f.f51_wavelet_hh1_kurt = moments(wv.HH1).kurt;
    let wEnt = 0; const all = Array.from(wv.HH1).concat(Array.from(wv.LH1)).concat(Array.from(wv.HL1));
    const tot = all.reduce((s,v)=>s+Math.abs(v), 0) || 1e-9;
    for (const v of all) { const p = Math.abs(v) / tot; if (p > 1e-9) wEnt -= p * safeLog(p); }
    f.f52_wavelet_entropy = wEnt;

    // ===== §10 DCT block stats (53-57) — 8×8 blocks on gray =====
    const blockStride = 32;  // sample every 32 pixels to stay cheap
    let dctAllSum = 0, dctAllSq = 0, dctN = 0, zeroCoeff = 0, totalCoeff = 0;
    const dctCoefficients = [];
    const blockVars = [];
    const blk = new Float32Array(64), out = new Float32Array(64);
    for (let y = 0; y + 8 <= h; y += blockStride) {
        for (let x = 0; x + 8 <= w; x += blockStride) {
            for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++)
                blk[yy*8 + xx] = gray[(y+yy)*w + (x+xx)] - 128;
            dct8(blk, out);
            for (let i = 1; i < 64; i++) {
                dctAllSum += out[i]; dctAllSq += out[i]*out[i]; dctN++;
                dctCoefficients.push(out[i]);
                if (Math.abs(out[i]) < 1) zeroCoeff++;
                totalCoeff++;
            }
            blockVars.push(out[0]);
        }
    }
    const dctMean = dctN ? dctAllSum / dctN : 0;
    const dctVar = dctN ? dctAllSq / dctN - dctMean * dctMean : 0;
    f.f53_dct_coef_mean = dctMean;
    f.f54_dct_coef_std = Math.sqrt(Math.max(dctVar, 0));
    f.f55_dct_coef_kurt = dctN ? moments(dctCoefficients).kurt : 0;
    f.f56_dct_zero_ratio = totalCoeff ? zeroCoeff / totalCoeff : 0;
    f.f57_dct_block_variance = variance(blockVars);

    return { features: f, viz: { mag, radial, rFFT, gFFT, bFFT, wv } };
}
