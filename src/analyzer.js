import { resolveImageMime, sha256 } from './utils.js';
import { runAllDetections } from './detect.js';
import { analyzeFrequency } from './frequency/index.js';
import { classifyEvidence } from './verdict.js';

function abortError() {
    return new DOMException('Analysis canceled', 'AbortError');
}

function throwIfAborted(signal) {
    if (signal?.aborted) throw abortError();
}

async function imageDimensions(blob) {
    const bitmap = await createImageBitmap(blob);
    try {
        return { width: bitmap.width, height: bitmap.height };
    } finally {
        bitmap.close?.();
    }
}

function statusCodes(items) {
    return (items || []).map(item => item?.code).filter(Boolean);
}

export function createAnalysisReport({
    file, hash, dimensions, detections, meta, jumbf, frequency, mode,
}) {
    const score = frequency?.score ?? null;
    const verdict = classifyEvidence(detections, score);
    const verification = jumbf?.verification || {};

    return {
        schemaVersion: 1,
        file: {
            name: file.name || 'image',
            type: file.type || 'application/octet-stream',
            size: file.size,
            width: dimensions.width,
            height: dimensions.height,
            sha256: hash,
        },
        mode,
        verdict: verdict.kind,
        c2pa: {
            present: Boolean(jumbf?.present || verification.present),
            status: verification.status || (jumbf?.present ? 'structure' : 'absent'),
            state: verification.state || null,
            verified: verification.verified === true,
            trusted: verification.trusted === true,
            invalid: verification.invalid === true,
            digitalSourceType: jumbf?.digitalSourceType || verification.digitalSourceType || null,
            claimGenerator: verification.claimGenerator || null,
            failures: statusCodes(verification.failure),
        },
        evidence: detections.filter(item => item.hit).map(item => ({
            title: item.title,
            category: item.category || 'unknown',
            confidence: item.confidence || null,
            aiEvidence: item.aiEvidence !== false,
        })),
        frequency: frequency ? {
            applicable: frequency.score?.applicable !== false,
            skipped: frequency.skipped === true,
            confidence: frequency.score?.confidence || null,
            score: frequency.score?.total ?? null,
            positive: frequency.score?.positive ?? null,
            negative: frequency.score?.negative ?? null,
            positiveFamilies: frequency.score?.positiveFamilies || [],
            calibrated: frequency.score?.calibrated === true,
            suitabilityReasons: frequency.suitability?.reasons || [],
        } : null,
        warnings: [
            meta?._error ? `metadata: ${meta._error}` : null,
            verification.error ? `c2pa: ${verification.error}` : null,
        ].filter(Boolean),
    };
}

export async function analyzeImage(file, options = {}) {
    const mode = options.mode === 'quick' ? 'quick' : 'full';
    const onProgress = options.onProgress || (() => {});
    const signal = options.signal;

    const mime = resolveImageMime(file);
    if (!file?.arrayBuffer || !mime) {
        throw new TypeError('Unsupported image type. Use JPEG, PNG, or WebP.');
    }

    throwIfAborted(signal);
    onProgress({ stage: 'read', pct: 2 });
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    throwIfAborted(signal);

    onProgress({ stage: 'identify', pct: 8 });
    const [hash, dimensions] = await Promise.all([
        sha256(buffer),
        imageDimensions(file),
    ]);
    throwIfAborted(signal);

    onProgress({ stage: 'provenance', pct: 18 });
    const { detections, meta, jumbf } = await runAllDetections(bytes, {
        mime,
    });
    throwIfAborted(signal);

    let frequency = null;
    if (mode === 'full') {
        frequency = await analyzeFrequency(bytes, mime, {
            signal,
            onProgress: progress => onProgress({
                ...progress,
                stage: `frequency.${progress.stage}`,
                pct: 35 + Math.round((progress.pct || 0) * 0.6),
            }),
        });
        throwIfAborted(signal);
    }

    onProgress({ stage: 'complete', pct: 100 });
    const report = createAnalysisReport({
        file: { name: file.name, type: mime, size: file.size },
        hash, dimensions, detections, meta, jumbf, frequency, mode,
    });
    return { report, details: { detections, meta, jumbf, frequency } };
}
