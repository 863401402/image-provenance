// Frequency-domain transforms — pure JS, no dependencies.
//
// All functions are Worker-safe (no DOM / no canvas).
// Arrays are Float32Array for speed and low GC pressure.

// ---------- 1D radix-2 FFT (iterative, in-place) ----------
// re, im: Float32Array of length N (power of two).
// direction: 1 = forward, -1 = inverse.
export function fft1d(re, im, direction = 1) {
    const N = re.length;
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            let t = re[i]; re[i] = re[j]; re[j] = t;
            t = im[i]; im[i] = im[j]; im[j] = t;
        }
    }
    // Butterfly
    for (let len = 2; len <= N; len <<= 1) {
        const ang = direction * 2 * Math.PI / len;
        const wlenRe = Math.cos(ang), wlenIm = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
            let wRe = 1, wIm = 0;
            const half = len >> 1;
            for (let k = 0; k < half; k++) {
                const aRe = re[i + k], aIm = im[i + k];
                const bRe = re[i + k + half] * wRe - im[i + k + half] * wIm;
                const bIm = re[i + k + half] * wIm + im[i + k + half] * wRe;
                re[i + k] = aRe + bRe; im[i + k] = aIm + bIm;
                re[i + k + half] = aRe - bRe; im[i + k + half] = aIm - bIm;
                const nwRe = wRe * wlenRe - wIm * wlenIm;
                const nwIm = wRe * wlenIm + wIm * wlenRe;
                wRe = nwRe; wIm = nwIm;
            }
        }
    }
    if (direction === -1) {
        for (let i = 0; i < N; i++) { re[i] /= N; im[i] /= N; }
    }
}

// ---------- 2D FFT via row/column passes ----------
// gray: Float32Array(w*h), w and h must both be powers of two.
// Returns { re, im } Float32Arrays of length w*h (row-major).
export function fft2d(gray, w, h) {
    const re = new Float32Array(gray), im = new Float32Array(gray.length);
    const rowRe = new Float32Array(w), rowIm = new Float32Array(w);
    const colRe = new Float32Array(h), colIm = new Float32Array(h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) { rowRe[x] = re[y * w + x]; rowIm[x] = im[y * w + x]; }
        fft1d(rowRe, rowIm, 1);
        for (let x = 0; x < w; x++) { re[y * w + x] = rowRe[x]; im[y * w + x] = rowIm[x]; }
    }
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) { colRe[y] = re[y * w + x]; colIm[y] = im[y * w + x]; }
        fft1d(colRe, colIm, 1);
        for (let y = 0; y < h; y++) { re[y * w + x] = colRe[y]; im[y * w + x] = colIm[y]; }
    }
    return { re, im };
}

// ---------- FFT magnitude spectrum, shifted so DC is at the center ----------
export function magnitudeShifted(re, im, w, h) {
    const mag = new Float32Array(w * h);
    const hw = w >> 1, hh = h >> 1;
    for (let y = 0; y < h; y++) {
        const sy = (y + hh) % h;
        for (let x = 0; x < w; x++) {
            const sx = (x + hw) % w;
            const i = y * w + x, si = sy * w + sx;
            mag[si] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        }
    }
    return mag;
}

// ---------- Downsample magnitude to a smaller viz grid (max-pool) ----------
export function downsampleMag(mag, w, h, dstW, dstH) {
    const out = new Float32Array(dstW * dstH);
    const kx = w / dstW, ky = h / dstH;
    for (let y = 0; y < dstH; y++) {
        const y0 = Math.floor(y * ky), y1 = Math.floor((y + 1) * ky);
        for (let x = 0; x < dstW; x++) {
            const x0 = Math.floor(x * kx), x1 = Math.floor((x + 1) * kx);
            let m = 0;
            for (let yy = y0; yy < y1; yy++)
                for (let xx = x0; xx < x1; xx++) {
                    const v = mag[yy * w + xx];
                    if (v > m) m = v;
                }
            out[y * dstW + x] = m;
        }
    }
    return out;
}

// ---------- Radial power spectrum ----------
// Bins the 2D magnitude by radius from DC (center-shifted) into `bins` buckets.
// `power` preserves the total energy in each annulus; `density` divides by the
// number of Fourier samples and is suitable for plotting and slope fitting.
export function radialSpectrumStats(mag, w, h, bins = 64) {
    const power = new Float64Array(bins), count = new Uint32Array(bins);
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(cx, cy);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = x - cx, dy = y - cy;
            const r = Math.sqrt(dx*dx + dy*dy);
            if (r >= maxR) continue;
            const b = Math.min(bins - 1, Math.floor(r / maxR * bins));
            const v = mag[y * w + x];
            power[b] += v * v;
            count[b]++;
        }
    }
    const density = new Float32Array(bins);
    for (let b = 0; b < bins; b++) density[b] = count[b] > 0 ? power[b] / count[b] : 0;
    return { power, density, count };
}

export function radialSpectrum(mag, w, h, bins = 64) {
    return radialSpectrumStats(mag, w, h, bins).density;
}

// ---------- 8×8 2D DCT-II (naive cosine; 64×64 ops per block is fine) ----------
// Input: Float32Array(64) — 8×8 block row-major, values 0..255.
// Output: Float32Array(64) — DCT-II coefficients.
const _dct8Cos = (() => {
    const c = new Float32Array(8 * 8);
    for (let u = 0; u < 8; u++)
        for (let x = 0; x < 8; x++)
            c[u * 8 + x] = Math.cos((2 * x + 1) * u * Math.PI / 16);
    return c;
})();

export function dct8(block, out) {
    out = out || new Float32Array(64);
    for (let v = 0; v < 8; v++) {
        for (let u = 0; u < 8; u++) {
            let s = 0;
            for (let y = 0; y < 8; y++)
                for (let x = 0; x < 8; x++)
                    s += block[y * 8 + x] * _dct8Cos[u * 8 + x] * _dct8Cos[v * 8 + y];
            const cu = u === 0 ? Math.SQRT1_2 : 1;
            const cv = v === 0 ? Math.SQRT1_2 : 1;
            out[v * 8 + u] = 0.25 * cu * cv * s;
        }
    }
    return out;
}

// ---------- Haar wavelet 2-level 2D decomposition ----------
// Returns { LL2, LH2, HL2, HH2, LH1, HL1, HH1 } as Float32Arrays.
// Input: Float32Array(w*h). w,h must be even at each level.
function haarStep(src, w, h) {
    const hw = w >> 1, hh = h >> 1;
    const LL = new Float32Array(hw * hh), LH = new Float32Array(hw * hh);
    const HL = new Float32Array(hw * hh), HH = new Float32Array(hw * hh);
    for (let y = 0; y < hh; y++) {
        for (let x = 0; x < hw; x++) {
            const a = src[2*y * w + 2*x], b = src[2*y * w + 2*x + 1];
            const c = src[(2*y+1) * w + 2*x], d = src[(2*y+1) * w + 2*x + 1];
            LL[y * hw + x] = (a + b + c + d) * 0.5;
            LH[y * hw + x] = (a + b - c - d) * 0.5;
            HL[y * hw + x] = (a - b + c - d) * 0.5;
            HH[y * hw + x] = (a - b - c + d) * 0.5;
        }
    }
    return { LL, LH, HL, HH, w: hw, h: hh };
}

export function haar2d2level(gray, w, h) {
    const l1 = haarStep(gray, w, h);
    const l2 = haarStep(l1.LL, l1.w, l1.h);
    return {
        LL2: l2.LL, LH2: l2.LH, HL2: l2.HL, HH2: l2.HH, w2: l2.w, h2: l2.h,
        LH1: l1.LH, HL1: l1.HL, HH1: l1.HH, w1: l1.w, h1: l1.h,
    };
}
