const AI_SOURCE_TYPES = [
    'trainedAlgorithmicMedia',
    'compositeWithTrainedAlgorithmicMedia',
    'algorithmicMedia',
    'dataDrivenMedia',
];

const SOURCE_TYPES = [...AI_SOURCE_TYPES, 'digitalCapture', 'digitalCreation', 'composite'];
let sdkPromise = null;

function loadSdk() {
    if (!sdkPromise) {
        sdkPromise = import('../vendor/c2pa/c2pa-web.js').then(async ({ createC2pa }) => {
            const options = {
                wasmSrc: new URL('../vendor/c2pa/c2pa_bg.wasm', import.meta.url).href,
                settings: { verify: { verifyTrust: true, verifyAfterReading: true } },
            };
            // The SDK requires an explicit worker URL to use HTTPS. On local HTTP,
            // omit it so c2pa-web falls back to its bundled Blob worker.
            if (location.protocol === 'https:') {
                options.workerSrc = new URL('../vendor/c2pa/c2pa_worker.js', import.meta.url);
            }
            return createC2pa(options);
        });
    }
    return sdkPromise;
}

function findSourceType(value, seen = new Set(), depth = 0) {
    if (depth > 12 || value == null) return null;
    if (typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);

    for (const [key, child] of Object.entries(value)) {
        const normalizedKey = key.replace(/[^a-z]/gi, '').toLowerCase();
        if (normalizedKey === 'digitalsourcetype' && typeof child === 'string') {
            const found = SOURCE_TYPES.find(type => child.includes(type));
            if (found) return found;
        }
    }
    for (const child of Object.values(value)) {
        const found = findSourceType(child, seen, depth + 1);
        if (found) return found;
    }
    return null;
}

function statusList(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isTrustWarning(status) {
    return /(?:^|\.)(?:untrusted|notTrusted)$/i.test(status?.code || '');
}

export function summarizeValidationStore(store = {}, manifest = null) {
    const active = store.validation_results?.activeManifest || {};
    const legacy = statusList(store.validation_status);
    const success = [
        ...statusList(active.success),
        ...legacy.filter(s => /(?:^|\.)(?:valid|validated|match|trusted)$/i.test(s.code || '')),
    ];
    const informational = statusList(active.informational);
    const failure = [...statusList(active.failure), ...legacy.filter(s => /mismatch|invalid|malformed|error|missing|expired|revoked/i.test(s.code || ''))];
    const state = store.validation_state || null;
    const integrityFailures = failure.filter(status => !isTrustWarning(status));
    const invalid = state === 'Invalid' || integrityFailures.length > 0;
    const verified = !invalid && (state === 'Valid' || state === 'Trusted');

    return {
        state,
        verified,
        trusted: verified && state === 'Trusted',
        invalid,
        success,
        informational,
        failure,
        integrityFailures,
        activeLabel: store.active_manifest || null,
        claimGenerator: manifest?.claim_generator || manifest?.claim_generator_info?.[0]?.name || null,
        title: manifest?.title || null,
        digitalSourceType: findSourceType(manifest),
    };
}

export function isAiSourceType(value) {
    return AI_SOURCE_TYPES.includes(value);
}

export async function verifyC2pa(uint8, mime = 'image/jpeg') {
    let reader = null;
    try {
        const sdk = await loadSdk();
        const blob = new Blob([uint8], { type: mime });
        reader = await sdk.reader.fromBlob(mime, blob);
        if (!reader) return { status: 'structure', present: true, verified: false };

        const [store, manifest] = await Promise.all([
            reader.manifestStore(),
            reader.activeManifest().catch(() => null),
        ]);
        const summary = summarizeValidationStore(store, manifest);
        return {
            status: summary.invalid ? 'invalid' : summary.trusted ? 'trusted'
                : summary.verified ? 'valid' : 'structure',
            present: true,
            ...summary,
        };
    } catch (err) {
        return {
            status: 'error',
            present: true,
            verified: false,
            invalid: false,
            error: err?.message || String(err),
            failure: [{ code: 'sdk.error', explanation: err?.message || String(err) }],
            success: [],
            informational: [],
        };
    } finally {
        await reader?.free?.().catch(() => {});
    }
}
