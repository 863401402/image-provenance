// Conversion pipeline: strip C2PA / AI markers, re-encode, inject fake EXIF.
// All client-side — image bytes never leave the browser.
//
// Stages:
//   1. Byte-level strip of C2PA JUMBF (JPEG APP11=0xEB, PNG caBX/C2PA chunks).
//   2. Canvas decode + re-encode to JPEG (wipes all remaining metadata since
//      canvas.toBlob emits a bare JPEG with no EXIF/XMP/ICC).
//   3. Inject fake camera EXIF via piexifjs (loaded on demand from jsdelivr).

const PIEXIF_URL = 'https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.js';
let _piexifPromise = null;

function loadPiexif() {
    if (_piexifPromise) return _piexifPromise;
    _piexifPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = PIEXIF_URL;
        s.onload = () => resolve(window.piexif);
        s.onerror = () => reject(new Error('piexifjs failed to load'));
        document.head.appendChild(s);
    });
    return _piexifPromise;
}

// --- C2PA byte-level strip (port of server.py:strip_c2pa_jpeg/png) ---

export function stripC2paJpeg(data) {
    if (data.length < 2 || data[0] !== 0xFF || data[1] !== 0xD8) {
        return { bytes: data, removed: 0, totalBytes: 0 };
    }
    const out = [0xFF, 0xD8];
    let pos = 2, removed = 0, totalRemoved = 0;
    while (pos < data.length - 1) {
        if (data[pos] !== 0xFF) {
            for (let i = pos; i < data.length; i++) out.push(data[i]);
            break;
        }
        const marker = data[pos + 1];
        if (marker === 0xDA) {                       // SOS → rest is image data
            for (let i = pos; i < data.length; i++) out.push(data[i]);
            break;
        }
        if (pos + 4 > data.length) {
            for (let i = pos; i < data.length; i++) out.push(data[i]);
            break;
        }
        const segLen = (data[pos + 2] << 8) | data[pos + 3];
        const segTotal = 2 + segLen;
        if (marker === 0xEB) {                       // APP11: JUMBF container
            removed++;
            totalRemoved += segTotal;
        } else {
            for (let i = pos; i < pos + segTotal && i < data.length; i++) out.push(data[i]);
        }
        pos += segTotal;
    }
    return { bytes: new Uint8Array(out), removed, totalBytes: totalRemoved };
}

const PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const PNG_C2PA_CHUNKS = ['caBX', 'C2PA', 'c2pa'];

export function stripC2paPng(data) {
    if (data.length < 8) return { bytes: data, removed: 0, totalBytes: 0 };
    for (let i = 0; i < 8; i++) if (data[i] !== PNG_SIG[i]) return { bytes: data, removed: 0, totalBytes: 0 };
    const out = Array.from(data.slice(0, 8));
    let pos = 8, removed = 0, totalRemoved = 0;
    while (pos + 8 <= data.length) {
        const chunkLen = (data[pos] << 24 | data[pos + 1] << 16 | data[pos + 2] << 8 | data[pos + 3]) >>> 0;
        const chunkType = String.fromCharCode(data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]);
        const chunkTotal = 12 + chunkLen;
        if (PNG_C2PA_CHUNKS.includes(chunkType)) {
            removed++;
            totalRemoved += chunkTotal;
        } else {
            for (let i = pos; i < pos + chunkTotal && i < data.length; i++) out.push(data[i]);
        }
        pos += chunkTotal;
    }
    return { bytes: new Uint8Array(out), removed, totalBytes: totalRemoved };
}

// --- Canvas re-encode to JPEG (wipes all metadata) ---

async function decodeToCanvas(bytes, mime) {
    const blob = new Blob([bytes], { type: mime });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    return canvas;
}

function canvasToJpegBlob(canvas, quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas.toBlob failed')), 'image/jpeg', quality);
    });
}

// --- EXIF injection ---

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function formatExifDate(d) {
    return `${d.getFullYear()}:${pad2(d.getMonth()+1)}:${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function buildExifBytes(piexif, profile) {
    const { TagValues, ImageIFD, ExifIFD, GPSIFD } = piexif;
    const now = new Date();
    const dateStr = formatExifDate(now);
    const zeroth = {
        [ImageIFD.Make]: profile.Make || 'Unknown',
        [ImageIFD.Model]: profile.Model || 'Unknown',
        [ImageIFD.Software]: profile.Software || '',
        [ImageIFD.DateTime]: dateStr,
        [ImageIFD.Orientation]: 1,
    };
    const exif = {
        [ExifIFD.DateTimeOriginal]: dateStr,
        [ExifIFD.DateTimeDigitized]: dateStr,
        [ExifIFD.LensModel]: profile.LensModel || '',
        [ExifIFD.ColorSpace]: 1,                                       // sRGB
        [ExifIFD.WhiteBalance]: profile.WhiteBalance === 'Auto' ? 0 : 1,
        [ExifIFD.Flash]: 0x10,                                         // no flash, not detected
    };
    if (profile.FNumber) exif[ExifIFD.FNumber] = [Math.round(profile.FNumber * 100), 100];
    if (profile.FocalLength) exif[ExifIFD.FocalLength] = [Math.round(profile.FocalLength * 1000), 1000];
    if (profile.ISO) exif[ExifIFD.ISOSpeedRatings] = profile.ISO;
    if (profile.ExposureTime) exif[ExifIFD.ExposureTime] = profile.ExposureTime;
    if (profile.LensMake) exif[ExifIFD.LensMake] = profile.LensMake;
    if (profile.MeteringMode === 'Multi-segment') exif[ExifIFD.MeteringMode] = 5;
    if (profile.ExposureProgram === 'Manual') exif[ExifIFD.ExposureProgram] = 1;
    else if (profile.ExposureProgram === 'Aperture priority') exif[ExifIFD.ExposureProgram] = 3;
    return piexif.dump({ '0th': zeroth, Exif: exif, GPS: {}, Interop: {}, '1st': {}, thumbnail: null });
}

async function injectExifIntoJpeg(jpegBlob, profile) {
    const piexif = await loadPiexif();
    const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(jpegBlob);
    });
    const exifStr = buildExifBytes(piexif, profile);
    const withExif = piexif.insert(exifStr, dataUrl);
    // dataURL → Uint8Array
    const comma = withExif.indexOf(',');
    const bin = atob(withExif.slice(comma + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new Blob([out], { type: 'image/jpeg' });
}

// --- Top-level orchestrator ---

export async function convertImage(inputBytes, inputMime, profile, opts = {}) {
    const quality = opts.quality ?? 0.92;
    const log = [];

    // 1. Strip C2PA at byte level
    let stripped;
    if (inputMime === 'image/jpeg') {
        stripped = stripC2paJpeg(inputBytes);
        if (stripped.removed) log.push(`移除 ${stripped.removed} 个 JPEG APP11 段 (${stripped.totalBytes}B)`);
    } else if (inputMime === 'image/png') {
        stripped = stripC2paPng(inputBytes);
        if (stripped.removed) log.push(`移除 ${stripped.removed} 个 PNG C2PA chunk (${stripped.totalBytes}B)`);
    } else {
        stripped = { bytes: inputBytes, removed: 0, totalBytes: 0 };
    }
    if (!stripped.removed) log.push('未发现 C2PA 结构,跳过剥离');

    // 2. Canvas re-encode → pure JPEG, all remaining metadata wiped
    const canvas = await decodeToCanvas(stripped.bytes, inputMime);
    log.push(`解码成功: ${canvas.width}×${canvas.height}, 重编码为 JPEG q=${Math.round(quality*100)}`);

    // 2.5 Optional watermark disruption happens here (task #8 hook)
    if (opts.disruptWatermark && typeof opts.disruptWatermark === 'function') {
        await opts.disruptWatermark(canvas);
        log.push('应用像素级水印扰动');
    }

    const plainJpeg = await canvasToJpegBlob(canvas, quality);

    // 3. Inject fake EXIF
    const withExif = await injectExifIntoJpeg(plainJpeg, profile);
    log.push(`注入 EXIF: ${profile.Make} ${profile.Model}`);

    return { blob: withExif, log };
}
