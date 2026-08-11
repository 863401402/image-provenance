import { convertImage } from '../convert.js';
import { disruptWatermark } from '../watermark.js';
import { resolveImageMime } from '../utils.js';

function throwIfAborted(signal) {
    if (signal?.aborted) throw new DOMException('Conversion canceled', 'AbortError');
}

export function conversionFileName(sourceName, make, suffix = Date.now().toString(36)) {
    const base = (sourceName || 'photo').replace(/\.[^.]+$/, '').trim() || 'photo';
    const safeBase = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    const safeMake = (make || 'camera').replace(/[^a-z0-9_-]+/gi, '_');
    return `${safeBase}_${safeMake}_${suffix}.jpg`;
}

export async function convertFile(file, options = {}) {
    const signal = options.signal;
    const onProgress = options.onProgress || (() => {});
    const profile = options.profile;
    const mime = resolveImageMime(file);
    if (!file?.arrayBuffer || !profile || !mime) throw new TypeError('A supported source image and camera profile are required.');

    throwIfAborted(signal);
    onProgress({ stage: 'read', pct: 5 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    throwIfAborted(signal);

    let watermarkReport = null;
    onProgress({ stage: 'convert', pct: 20 });
    const { blob, log, dimensions, quality, backgroundColor } = await convertImage(bytes, mime, profile, {
        quality: options.quality,
        advanced: options.advanced,
        backgroundColor: options.backgroundColor,
        disruptWatermark: options.disrupt ? async canvas => {
            onProgress({ stage: 'watermark', pct: 45 });
            watermarkReport = await disruptWatermark(canvas, {
                intensity: options.intensity,
                techniques: options.techniques,
            });
        } : null,
    });
    throwIfAborted(signal);

    if (watermarkReport) {
        for (const line of watermarkReport.log) log.push(`  - ${line}`);
    }
    onProgress({ stage: 'complete', pct: 100 });

    return {
        blob,
        conversion: {
            outputName: conversionFileName(file.name, profile.Make, options.suffix),
            outputSize: blob.size,
            profileMake: profile.Make,
            profileModel: profile.Model,
            quality,
            width: dimensions.width,
            height: dimensions.height,
            backgroundColor,
            watermarkDisrupted: Boolean(options.disrupt),
            techniques: options.disrupt ? [...(options.techniques || [])] : [],
            log,
        },
    };
}
