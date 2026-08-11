const FFLATE_URL = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js';
let fflatePromise = null;

function loadFflate() {
    if (fflatePromise) return fflatePromise;
    fflatePromise = import(/* @vite-ignore */ FFLATE_URL).catch(error => {
        fflatePromise = null;
        throw error;
    });
    return fflatePromise;
}

export function attachArchiveNames(manifest, names) {
    return {
        ...manifest,
        items: (manifest?.items || []).map((item, index) => ({
            ...item,
            archiveName: names[index] || null,
        })),
    };
}

export function uniqueArchiveNames(names) {
    const used = new Set();
    return names.map((name, index) => {
        const safe = (name || `image-${index + 1}.jpg`).replace(/[\\/:*?"<>|\x00-\x1F]/g, '_');
        const dot = safe.lastIndexOf('.');
        const stem = dot > 0 ? safe.slice(0, dot) : safe;
        const ext = dot > 0 ? safe.slice(dot) : '';
        let candidate = safe;
        let suffix = 2;
        while (used.has(candidate.toLowerCase())) candidate = `${stem}-${suffix++}${ext}`;
        used.add(candidate.toLowerCase());
        return candidate;
    });
}

export async function createConversionZip(entries, manifest) {
    const { zip } = await loadFflate();
    const encoder = new TextEncoder();
    const names = uniqueArchiveNames(entries.map(entry => entry.name));
    const files = {};

    for (let index = 0; index < entries.length; index++) {
        files[names[index]] = [new Uint8Array(await entries[index].blob.arrayBuffer()), { level: 0 }];
    }
    files['manifest.json'] = encoder.encode(JSON.stringify(attachArchiveNames(manifest, names), null, 2));

    const bytes = await new Promise((resolve, reject) => {
        zip(files, { level: 6 }, (error, data) => error ? reject(error) : resolve(data));
    });
    return new Blob([bytes], { type: 'application/zip' });
}
