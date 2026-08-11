// Main-thread entry to the frequency-analysis Worker.
//
// Responsibilities on this side:
//   - Decode image, downsample to a power-of-two square (1024 or 512 depending
//     on source size and device hints) on a main-thread canvas.
//   - Convert to RGBA + grayscale Float32.
//   - Spin up the Worker, pipe progress events back to the caller.

const POW2_TARGETS = [1024, 768, 512, 384, 256];

function pickSize(w, h, isMobile) {
    const maxDim = isMobile ? 768 : 1024;
    const m = Math.min(maxDim, Math.max(w, h));
    for (const t of POW2_TARGETS) if (t <= m) return t;
    return 256;
}

function nearestPow2(n) {
    return 1 << Math.floor(Math.log2(Math.max(n, 2)));
}

async function containsQrCode(bitmap) {
    if (!globalThis.BarcodeDetector) return false;
    try {
        const formats = await BarcodeDetector.getSupportedFormats?.();
        if (formats && !formats.includes('qr_code')) return false;
        const results = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bitmap);
        return results.length > 0;
    } catch {
        return false;
    }
}

export async function analyzeFrequency(bytes, mime, opts = {}) {
    const onProgress = opts.onProgress || (() => {});
    const blob = new Blob([bytes], { type: mime });
    const bitmap = await createImageBitmap(blob);
    try {
        if (await containsQrCode(bitmap)) {
            return {
                skipped: true,
                suitability: { suitable: false, reasons: ['qrCode'], metrics: {} },
                score: { applicable: false, confidence: null, total: 0, positive: 0, negative: 0, votes: [] },
                timing: { features: 0, score: 0 },
                side: null,
            };
        }
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const side = nearestPow2(Math.min(pickSize(bitmap.width, bitmap.height, isMobile),
                                          Math.max(bitmap.width, bitmap.height)));
        onProgress({ stage: 'resize', pct: 3, info: `${bitmap.width}×${bitmap.height} → ${side}×${side}` });

        const canvas = document.createElement('canvas');
        canvas.width = side; canvas.height = side;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Letterbox-free: fit the bitmap aspect-preserving, padding with black.
        // Simpler: just stretch. Frequency features on a stretched raster are
        // still informative — we're not doing CNN inference.
        ctx.drawImage(bitmap, 0, 0, side, side);
        const rgba = ctx.getImageData(0, 0, side, side).data;
        const gray = new Float32Array(side * side);
        for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
            // Rec. 601 luminance
            gray[j] = 0.299 * rgba[i] + 0.587 * rgba[i+1] + 0.114 * rgba[i+2];
        }

        return await new Promise((resolve, reject) => {
            const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
            worker.onmessage = (e) => {
                const m = e.data;
                if (m.type === 'progress') onProgress(m);
                else if (m.type === 'error') { worker.terminate(); reject(new Error(m.message)); }
                else if (m.type === 'result') { worker.terminate(); resolve({ ...m, side }); }
            };
            worker.onerror = (err) => {
                worker.terminate();
                reject(new Error('Frequency worker failed: ' + (err.message || 'unknown')));
            };
            // RGBA is a Uint8ClampedArray → we need its underlying buffer for transfer.
            // But getImageData()'s buffer is not detachable on some browsers. So we
            // copy into a fresh Uint8ClampedArray first (which is transferable).
            const rgbaCopy = new Uint8ClampedArray(rgba);
            worker.postMessage({
                type: 'analyze', rgba: rgbaCopy, gray, w: side, h: side,
            }, [rgbaCopy.buffer, gray.buffer]);
        });
    } finally {
        bitmap.close?.();
    }
}
