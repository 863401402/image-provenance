// Watermark disruption v2 — 8 techniques, preset- or custom-driven.
//
// All techniques mutate the canvas in place and preserve aspect ratio /
// orientation / composition. No rotation, flip, or resize.
//
// techniques[] ids:
//   'geom'       — crop + rescale (aspect-preserving)
//   'noise'      — additive Gaussian RGB noise
//   'unsharp'    — 3×3 separable unsharp mask (compensates #1-2 softening)
//   'doubleJpeg' — one extra encode/decode at mid-quality
//   'chShift'    — R +dx / B −dx channel shift (sub-pixel-perceived)
//   'bandNoise'  — low-frequency smooth noise (perturbs frequency envelope)
//   'fftPhase'   — real 2D-FFT mid-band phase perturbation (SynthID target)
//   'median'     — 3×3 median filter (kills single-pixel LSB stego)

import { fft2d, fft1d } from './frequency/transforms.js';

const DEFAULT_TECHNIQUES = ['geom', 'noise', 'unsharp', 'doubleJpeg'];
const DEFAULT_INTENSITY = 3;

export const PRESETS = {
    light:  { label: '轻量',   techniques: ['geom', 'noise'] },
    rec:    { label: '推荐',   techniques: ['geom', 'noise', 'unsharp', 'doubleJpeg'] },
    strong: { label: '强力',   techniques: ['geom', 'noise', 'unsharp', 'doubleJpeg', 'chShift', 'bandNoise'] },
    ultra:  { label: '极限',   techniques: ['geom', 'noise', 'unsharp', 'doubleJpeg', 'chShift', 'bandNoise', 'fftPhase', 'median'] },
};

// ---- helpers ----
function gauss() {
    let u = Math.random(), v = Math.random();
    while (u <= 0) u = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function nearestPow2Down(n) { return 1 << Math.floor(Math.log2(Math.max(n, 2))); }

// ---- #1 Geometric micro-crop + rescale ----
function geom(canvas, intensity) {
    const w = canvas.width, h = canvas.height;
    const pct = 0.003 * intensity;
    const left = Math.floor(w * pct);
    const top = Math.floor(h * pct);
    const right = w - Math.floor(w * pct * 0.7);
    const bottom = h - Math.floor(h * pct * 0.7);
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, left, top, right - left, bottom - top, 0, 0, w, h);
    canvas.getContext('2d').drawImage(out, 0, 0);
    return { crop: pct };
}

// ---- #2 Gaussian RGB noise ----
function noise(canvas, intensity) {
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const sigma = intensity * 1.25;
    for (let i = 0; i < d.length; i += 4) {
        d[i]   = clamp(d[i]   + Math.round(gauss() * sigma));
        d[i+1] = clamp(d[i+1] + Math.round(gauss() * sigma));
        d[i+2] = clamp(d[i+2] + Math.round(gauss() * sigma));
    }
    ctx.putImageData(img, 0, 0);
    return { sigma };
}
function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

// ---- #3 Unsharp mask (separable 3×3) ----
function unsharp(canvas, amount = 0.5) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const src = img.data;
    const tmp = new Uint8ClampedArray(src.length);
    const blurred = new Uint8ClampedArray(src.length);
    // H blur
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y*w + x) * 4;
        for (let c = 0; c < 3; c++) {
            const l = x > 0 ? src[i-4+c] : src[i+c];
            const r = x < w-1 ? src[i+4+c] : src[i+c];
            tmp[i+c] = (l + src[i+c] + r) / 3;
        }
        tmp[i+3] = src[i+3];
    }
    // V blur
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y*w + x) * 4;
        for (let c = 0; c < 3; c++) {
            const u = y > 0 ? tmp[i - w*4 + c] : tmp[i+c];
            const d2 = y < h-1 ? tmp[i + w*4 + c] : tmp[i+c];
            blurred[i+c] = (u + tmp[i+c] + d2) / 3;
        }
    }
    // out = src + amount*(src - blurred)
    for (let i = 0; i < src.length; i += 4) {
        for (let c = 0; c < 3; c++) src[i+c] = clamp(src[i+c] + amount * (src[i+c] - blurred[i+c]));
    }
    ctx.putImageData(img, 0, 0);
    return {};
}

// ---- #4 Double JPEG ----
async function doubleJpeg(canvas, midQ) {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', midQ));
    if (!blob) return { skipped: true };
    const bitmap = await createImageBitmap(blob);
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return { midQ };
}

// ---- #5 Channel micro-shift ----
function chShift(canvas, dx) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(img.data);   // snapshot
    const out = img.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y*w + x) * 4;
            const rx = Math.max(0, Math.min(w-1, x + dx));
            const bx = Math.max(0, Math.min(w-1, x - dx));
            out[i]   = src[(y*w + rx) * 4];     // R from shifted right
            // green unchanged
            out[i+2] = src[(y*w + bx) * 4 + 2]; // B from shifted left
        }
    }
    ctx.putImageData(img, 0, 0);
    return { shiftPx: dx };
}

// ---- #6 Low-frequency band noise ----
// Generate a coarse noise at ~w/32 × h/32, upscale with bilinear, add to image.
function bandNoise(canvas, amp) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const sw = Math.max(8, Math.floor(w / 32));
    const sh = Math.max(8, Math.floor(h / 32));
    const small = document.createElement('canvas');
    small.width = sw; small.height = sh;
    const sctx = small.getContext('2d');
    const simg = sctx.createImageData(sw, sh);
    for (let i = 0; i < simg.data.length; i += 4) {
        const n = gauss() * amp * 10;
        const v = 128 + n;
        simg.data[i] = simg.data[i+1] = simg.data[i+2] = clamp(v);
        simg.data[i+3] = 255;
    }
    sctx.putImageData(simg, 0, 0);

    // upscale with high-quality smoothing → a smooth low-frequency map
    const big = document.createElement('canvas');
    big.width = w; big.height = h;
    const bctx = big.getContext('2d');
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(small, 0, 0, w, h);
    const bigImg = bctx.getImageData(0, 0, w, h);

    // add (map - 128) back onto the source, scaled.
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const map = bigImg.data;
    for (let i = 0; i < d.length; i += 4) {
        const delta = map[i] - 128;
        d[i]   = clamp(d[i]   + delta);
        d[i+1] = clamp(d[i+1] + delta);
        d[i+2] = clamp(d[i+2] + delta);
    }
    ctx.putImageData(img, 0, 0);
    return { bandScale: `${sw}×${sh}`, amp };
}

// ---- #7 2D-FFT mid-band phase perturbation ----
async function fftPhase(canvas, maxDev) {
    const w = canvas.width, h = canvas.height;
    // Operate on a pow-of-2 square up to 1024 for speed
    const N = Math.min(1024, nearestPow2Down(Math.min(w, h)));
    // Downsample
    const work = document.createElement('canvas');
    work.width = N; work.height = N;
    const wctx = work.getContext('2d');
    wctx.imageSmoothingEnabled = true;
    wctx.imageSmoothingQuality = 'high';
    wctx.drawImage(canvas, 0, 0, N, N);
    const img = wctx.getImageData(0, 0, N, N);
    const d = img.data;

    for (let ch = 0; ch < 3; ch++) {
        const plane = new Float32Array(N * N);
        for (let i = 0; i < N * N; i++) plane[i] = d[i * 4 + ch];
        const { re, im } = fft2d(plane, N, N);

        // perturb mid-band phase
        const cx = N / 2, cy = N / 2;
        const maxR = Math.min(cx, cy);
        const rLo = maxR * 0.15, rHi = maxR * 0.7;
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                // Note fft2d output is NOT shifted — DC at (0,0). Use
                // wrap-around radius.
                const dxw = x > N/2 ? x - N : x;
                const dyw = y > N/2 ? y - N : y;
                const r = Math.sqrt(dxw*dxw + dyw*dyw);
                if (r < rLo || r > rHi) continue;
                const idx = y * N + x;
                const rr = re[idx], ii = im[idx];
                const mag2 = rr*rr + ii*ii;
                if (mag2 < 1) continue;   // silent bin — skip
                const mag = Math.sqrt(mag2);
                const ph = Math.atan2(ii, rr) + (Math.random() * 2 - 1) * maxDev;
                re[idx] = mag * Math.cos(ph);
                im[idx] = mag * Math.sin(ph);
            }
        }
        // inverse 2D-FFT via row/col fft1d with direction=-1
        const rowRe = new Float32Array(N), rowIm = new Float32Array(N);
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) { rowRe[x] = re[y*N+x]; rowIm[x] = im[y*N+x]; }
            fft1d(rowRe, rowIm, -1);
            for (let x = 0; x < N; x++) { re[y*N+x] = rowRe[x]; im[y*N+x] = rowIm[x]; }
        }
        const colRe = new Float32Array(N), colIm = new Float32Array(N);
        for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) { colRe[y] = re[y*N+x]; colIm[y] = im[y*N+x]; }
            fft1d(colRe, colIm, -1);
            for (let y = 0; y < N; y++) { re[y*N+x] = colRe[y]; im[y*N+x] = colIm[y]; }
        }
        for (let i = 0; i < N * N; i++) d[i * 4 + ch] = clamp(re[i]);
    }
    wctx.putImageData(img, 0, 0);

    // blit back onto original canvas (up-scaled)
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(work, 0, 0, w, h);
    return { N, maxDevDeg: (maxDev * 180 / Math.PI).toFixed(1) };
}

// ---- #8 Median 3×3 ----
function median3(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(img.data);
    const d = img.data;
    const buf = new Array(9);
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const base = (y*w + x) * 4;
            for (let c = 0; c < 3; c++) {
                let k = 0;
                for (let yy = -1; yy <= 1; yy++)
                    for (let xx = -1; xx <= 1; xx++)
                        buf[k++] = src[((y+yy)*w + (x+xx))*4 + c];
                buf.sort((a,b) => a - b);
                d[base + c] = buf[4];
            }
        }
    }
    ctx.putImageData(img, 0, 0);
    return {};
}

// ---- Top-level orchestrator ----
export async function disruptWatermark(canvas, options = {}) {
    const intensity = Math.max(1, Math.min(5, options.intensity ?? DEFAULT_INTENSITY));
    const techniques = options.techniques && options.techniques.length
        ? options.techniques
        : DEFAULT_TECHNIQUES;
    const log = [];
    const applied = [];
    const totalT0 = performance.now();

    for (const t of techniques) {
        const t0 = performance.now();
        try {
            if (t === 'geom')       { const r = geom(canvas, intensity);       log.push(`几何扰动: crop ${(r.crop*100).toFixed(2)}% (${ms(t0)})`); }
            else if (t === 'noise') { const r = noise(canvas, intensity);      log.push(`高斯噪声: σ≈${r.sigma.toFixed(1)} (${ms(t0)})`); }
            else if (t === 'unsharp'){ unsharp(canvas, 0.5);                   log.push(`锐化补偿 (${ms(t0)})`); }
            else if (t === 'doubleJpeg') {
                const midQ = Math.max(0.55, 0.75 - 0.03 * intensity);
                const r = await doubleJpeg(canvas, midQ);
                log.push(r.skipped ? `双次JPEG: 跳过 (toBlob 失败)` : `双次JPEG: 中间 q=${Math.round(r.midQ*100)} (${ms(t0)})`);
            }
            else if (t === 'chShift') {
                const dx = Math.max(1, Math.floor(intensity / 2));
                const r = chShift(canvas, dx);
                log.push(`通道位移: ±${r.shiftPx}px (${ms(t0)})`);
            }
            else if (t === 'bandNoise') {
                const r = bandNoise(canvas, intensity * 0.8);
                log.push(`低频带状噪声: ${r.bandScale} amp=${r.amp.toFixed(1)} (${ms(t0)})`);
            }
            else if (t === 'fftPhase') {
                const maxDev = Math.PI / 60 * (intensity / 3);
                const r = await fftPhase(canvas, maxDev);
                log.push(`FFT 相位扰动: ${r.N}² @ ±${r.maxDevDeg}° (${ms(t0)})`);
            }
            else if (t === 'median') {
                if (intensity >= 3) { median3(canvas); log.push(`中值滤波 3×3 (${ms(t0)})`); }
                else { log.push(`中值滤波: 跳过 (intensity<3)`); continue; }
            }
            else continue;
            applied.push(t);
        } catch (err) {
            log.push(`${t} 失败: ${err.message}`);
        }
    }
    const totalMs = (performance.now() - totalT0).toFixed(0);
    log.push(`共应用 ${applied.length} 项,总耗时 ${totalMs}ms`);
    return { intensity, techniques: applied, log };
}
function ms(t0) { return (performance.now() - t0).toFixed(0) + 'ms'; }
