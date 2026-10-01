// Bounded, local reading of GB 45438-2025 / TC260 image metadata declarations.
// This validates syntax and placement, not the identity of a provider or a signature.
const MAX_PACKET = 262144;
const MAX_VALUE = 65536;
const MAX_FIELDS = 4096;
const MAX_ENTRIES = 16;
const MAX_CHUNKS = 10000;
const TC260_NS = 'http://www.tc260.org.cn/ns/AIGC/1.0';
const XMP_HEADER = 'http://ns.adobe.com/xap/1.0/\0';
const FIELDS = ['Label', 'ContentProducer', 'ProduceID', 'ReservedCode1',
    'ContentPropagator', 'PropagateID', 'ReservedCode2'];
const utf8 = new TextDecoder('utf-8', { fatal: true });
const ascii = new TextDecoder('latin1');

function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkJsonKeys(text) {
    const stack = [];
    const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|[^\s{}\[\]:,]+/g) || [];
    for (const token of tokens) {
        const frame = stack.at(-1);
        if (frame?.keys && frame.expectKey && token.startsWith('"')) {
            const key = JSON.parse(token);
            if (frame.keys.has(key)) throw new Error('payload.duplicateKey');
            frame.keys.add(key);
            frame.expectKey = false;
        }
        if (token === '{' || token === '[') {
            if (stack.length >= 16) throw new Error('payload.depth');
            stack.push(token === '{' ? { keys: new Set(), expectKey: true } : {});
        } else if (token === '}' || token === ']') stack.pop();
        else if (token === ',' && frame?.keys) frame.expectKey = true;
    }
}

export function parseAigcValue(text) {
    const issues = [];
    if (typeof text !== 'string' || text.length > MAX_VALUE) {
        return { fields: {}, valid: false, issues: ['payload.limit'] };
    }
    let value;
    try {
        value = JSON.parse(text);
        checkJsonKeys(text);
    } catch (error) {
        return { fields: {}, valid: false, issues: [error.message.startsWith('payload.') ? error.message : 'payload.json'] };
    }
    if (object(value) && Object.hasOwn(value, 'AIGC')) value = value.AIGC;
    if (!object(value)) return { fields: {}, valid: false, issues: ['payload.object'] };
    const fields = {};
    for (const key of FIELDS) {
        if (!Object.hasOwn(value, key) || typeof value[key] !== 'string') {
            issues.push(`field.${key}.string`);
        } else if (value[key].length > MAX_FIELDS || /[\x00-\x1f\x7f]/.test(value[key])) {
            issues.push(`field.${key}.invalid`);
        } else {
            fields[key] = value[key];
        }
    }
    if (!['1', '2', '3'].includes(fields.Label)) issues.push('field.Label.enum');
    for (const key of ['ContentProducer', 'ProduceID']) {
        if (typeof fields[key] === 'string' && !fields[key].trim()) issues.push(`field.${key}.empty`);
    }
    return { fields, valid: issues.length === 0, issues };
}

function xmlText(text) {
    if (/&(?!amp;|lt;|gt;|quot;|apos;|#[0-9]+;|#x[0-9a-f]+;)/i.test(text)) throw new Error('xmp.entity');
    return text.replace(/&([^;]*);/g, (_, name) => {
        const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
        if (Object.hasOwn(named, name)) return named[name];
        if (/^#(?:[0-9]+|x[0-9a-f]+)$/i.test(name)) {
            const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
            if (code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) return String.fromCodePoint(code);
        }
        throw new Error('xmp.entity');
    });
}

// Small XML reader for simple XMP scalar properties. Namespace scopes are respected;
// arbitrary captions, comments and DTD entities are never searched for JSON.
export function readAigcXmp(text) {
    if (text.length > MAX_PACKET || /<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('xmp.unsupported');
    const values = [];
    const stack = [];
    const xml = text.trim().replace(/\0+$/, '').trim();
    const tokens = xml.match(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+/g) || [];
    if (tokens.join('') !== xml) throw new Error('xmp.structure');
    let roots = 0;
    const isAigc = (name, ns) => {
        const [prefix, local] = name.includes(':') ? name.split(':') : ['', name];
        return local === 'AIGC' && (ns.get(prefix) || '').replace(/\/$/, '') === TC260_NS;
    };
    for (const token of tokens) {
        if (token.startsWith('<!--') || token.startsWith('<?')) continue;
        if (!token.startsWith('<') || token.startsWith('<![CDATA[')) {
            const content = token.startsWith('<![CDATA[') ? token.slice(9, -3) : xmlText(token);
            if (stack.at(-1)?.aigc) stack.at(-1).text += content;
            else if (!stack.length && content.trim()) throw new Error('xmp.structure');
            continue;
        }
        if (token.startsWith('</')) {
            const node = stack.pop();
            const close = token.match(/^<\/([\w.-]+(?::[\w.-]+)?)\s*>$/);
            if (!node || close?.[1] !== node.name) throw new Error('xmp.structure');
            if (node.aigc) values.push(node.text);
            continue;
        }
        const tag = token.match(/^<([\w.-]+(?::[\w.-]+)?)([\s\S]*?)(\/?)>$/);
        if (!tag || stack.length >= 32 || stack.at(-1)?.aigc) throw new Error('xmp.structure');
        if (!stack.length && ++roots > 1) throw new Error('xmp.structure');
        const ns = new Map(stack.at(-1)?.ns || []);
        const attrs = [];
        let remaining = tag[2];
        while (remaining.trim()) {
            const attr = remaining.match(/^\s+([\w.-]+(?::[\w.-]+)?)\s*=\s*("[^"]*"|'[^']*')/);
            if (!attr || attrs.length >= 128 || attrs.some(([key]) => key === attr[1])) throw new Error('xmp.attribute');
            attrs.push([attr[1], xmlText(attr[2].slice(1, -1))]);
            remaining = remaining.slice(attr[0].length);
        }
        for (const [key, value] of attrs) {
            if (key === 'xmlns') ns.set('', value);
            else if (key.startsWith('xmlns:')) ns.set(key.slice(6), value);
        }
        for (const [key, value] of attrs) {
            // XML default namespaces do not apply to unprefixed attributes.
            if (key.includes(':') && isAigc(key, ns)) values.push(value);
        }
        const node = { name: tag[1], ns, aigc: isAigc(tag[1], ns), text: '' };
        if (tag[3]) { if (node.aigc) values.push(''); }
        else stack.push(node);
        if (values.length > MAX_ENTRIES) throw new Error('metadata.limit');
    }
    if (stack.length || roots !== 1) throw new Error('xmp.structure');
    return values;
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

async function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('compression.unsupported');
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    const parts = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > MAX_PACKET) throw new Error('metadata.limit');
            parts.push(value);
        }
    } catch (error) {
        await reader.cancel().catch(() => {});
        throw error;
    } finally { reader.releaseLock(); }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.length; }
    return output;
}

export async function readAigcMetadata(bytes, metadata = {}) {
    const labels = [];
    const warnings = [];
    let packets = 0;
    let totalBytes = 0;
    const add = (text, source) => {
        if (labels.length >= MAX_ENTRIES) { warnings.push('metadata.limit'); return; }
        labels.push({ ...parseAigcValue(text), sources: [source] });
    };
    const packet = async (data, source, xmp = false, compressed = false) => {
        if (++packets > MAX_ENTRIES || data.length > MAX_PACKET || (totalBytes += data.length) > MAX_PACKET * 4) {
            warnings.push('metadata.limit'); return;
        }
        try {
            const decoded = compressed ? await inflate(data) : data;
            const text = utf8.decode(decoded);
            if (xmp) for (const value of readAigcXmp(text)) add(value, source);
            else add(text, source);
        } catch (error) { warnings.push(/^(?:xmp|compression|metadata)\.[a-z]+$/.test(error.message) ? error.message : 'metadata.decode'); }
    };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const typeAt = (pos, size = 4) => ascii.decode(bytes.subarray(pos, pos + size));
    const zeroAt = (pos, end) => {
        for (let i = pos; i < end; i++) if (bytes[i] === 0) return i;
        return -1;
    };
    if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) {
        let pos = 8;
        let chunks = 0;
        let ended = false;
        while (pos + 12 <= bytes.length && chunks++ < MAX_CHUNKS) {
            const size = view.getUint32(pos);
            const end = pos + 8 + size;
            if (end + 4 > bytes.length) { warnings.push('png.truncated'); break; }
            const type = typeAt(pos + 4);
            if (pos === 8 && (type !== 'IHDR' || size !== 13)) { warnings.push('png.structure'); break; }
            if (['tEXt', 'iTXt', 'zTXt'].includes(type)) {
                const start = pos + 8;
                const split = zeroAt(start, Math.min(end, start + 80));
                const key = split < 0 ? '' : typeAt(start, split - start);
                const xmp = key === 'XML:com.adobe.xmp';
                if (/AIGC/i.test(key) || xmp) {
                    if (size > MAX_PACKET) warnings.push('metadata.limit');
                    else if (crc32(bytes.subarray(pos + 4, end)) !== view.getUint32(end)) warnings.push('png.crc');
                    else if (type === 'tEXt') await packet(bytes.subarray(split + 1, end), 'png.tEXt', xmp);
                    else if (type === 'zTXt') {
                        if (split + 2 >= end || bytes[split + 1] !== 0) warnings.push('png.text');
                        else await packet(bytes.subarray(split + 2, end), 'png.zTXt', xmp, true);
                    } else {
                        const language = zeroAt(split + 3, end);
                        const translated = language < 0 ? -1 : zeroAt(language + 1, end);
                        if (split + 3 > end || language < 0 || translated < 0
                            || bytes[split + 1] > 1 || bytes[split + 2] !== 0) warnings.push('png.text');
                        else await packet(bytes.subarray(translated + 1, end), 'png.iTXt', xmp, bytes[split + 1] === 1);
                    }
                }
            }
            pos = end + 4;
            if (type === 'IEND') {
                ended = size === 0;
                if (!ended) warnings.push('png.structure');
                break;
            }
        }
        if (!ended) warnings.push(chunks >= MAX_CHUNKS ? 'metadata.limit' : 'png.truncated');
    } else if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        let pos = 2;
        let segments = 0;
        let ended = false;
        while (pos < bytes.length && segments++ < MAX_CHUNKS) {
            if (bytes[pos++] !== 0xff) { warnings.push('jpeg.structure'); break; }
            while (pos < bytes.length && bytes[pos] === 0xff) pos++;
            const marker = bytes[pos++];
            if (marker === 0xda || marker === 0xd9) { ended = true; break; } // Never search compressed scan bytes.
            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
            if (pos + 2 > bytes.length) { warnings.push('jpeg.truncated'); break; }
            const size = view.getUint16(pos);
            if (size < 2 || pos + size > bytes.length) { warnings.push('jpeg.truncated'); break; }
            if (marker === 0xe1 && typeAt(pos + 2, XMP_HEADER.length) === XMP_HEADER) {
                await packet(bytes.subarray(pos + 2 + XMP_HEADER.length, pos + size), 'jpeg.APP1.XMP', true);
            }
            pos += size;
        }
        if (segments >= MAX_CHUNKS) warnings.push('metadata.limit');
        if (!ended) warnings.push('jpeg.truncated');
    } else if (bytes.length >= 12 && typeAt(0) === 'RIFF' && typeAt(8) === 'WEBP') {
        const end = view.getUint32(4, true) + 8;
        if (end > bytes.length || end < 12) warnings.push('webp.truncated');
        else {
            let pos = 12;
            let chunks = 0;
            while (pos + 8 <= end && chunks++ < MAX_CHUNKS) {
                const size = view.getUint32(pos + 4, true);
                const next = pos + 8 + size + (size & 1);
                if (next > end) { warnings.push('webp.truncated'); break; }
                if (typeAt(pos) === 'XMP ') await packet(bytes.subarray(pos + 8, pos + 8 + size), 'webp.XMP', true);
                pos = next;
            }
            if (pos !== end) warnings.push(chunks >= MAX_CHUNKS ? 'metadata.limit' : 'webp.structure');
        }
    }
    // Exifr may expose a UserComment, but only an exact JSON AIGC wrapper is accepted.
    // Captions/descriptions, bare Label fields and general byte strings are ignored.
    if (typeof metadata.UserComment === 'string' && metadata.UserComment.length <= MAX_VALUE) {
        try {
            const comment = JSON.parse(metadata.UserComment);
            if (object(comment) && Object.hasOwn(comment, 'AIGC')) add(metadata.UserComment, 'exif.UserComment');
        } catch { /* ordinary user comments are not AIGC labels */ }
    }
    const unique = [];
    for (const label of labels) {
        const previous = unique.find(item => JSON.stringify(item.fields) === JSON.stringify(label.fields)
            && JSON.stringify(item.issues) === JSON.stringify(label.issues));
        if (previous) previous.sources.push(...label.sources.filter(source => !previous.sources.includes(source)));
        else unique.push(label);
    }
    const valid = unique.filter(label => label.valid);
    const conflict = valid.length > 1;
    const incomplete = unique.some(label => !label.valid) || warnings.length > 0;
    const declaration = !conflict && valid.length === 1
        ? ({ '1': 'generated', '2': 'possible', '3': 'suspected' })[valid[0].fields.Label] : null;
    return {
        status: conflict ? 'conflict' : valid.length ? 'present' : unique.length || warnings.length ? 'unreadable' : 'absent',
        declaration,
        confidence: valid.length ? declaration === 'generated' && !incomplete ? 'medium' : 'weak' : null,
        verified: false,
        labels: unique,
        warnings: [...new Set(warnings)],
    };
}
