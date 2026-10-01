import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { parseAigcValue, readAigcXmp, readAigcMetadata } from '../src/aigc.js';
import { runAllDetections } from '../src/detect.js';
import { classifyEvidence } from '../src/verdict.js';

const encoder = new TextEncoder();
const label = (flag = '1') => ({ Label: flag, ContentProducer: '示例生成服务', ProduceID: 'image-123',
    ReservedCode1: '', ContentPropagator: '示例传播服务', PropagateID: 'post-456', ReservedCode2: '' });
const join = (...parts) => Buffer.concat(parts.map(part => Buffer.from(part)));
const text = value => encoder.encode(value);
const crc = bytes => {
    let value = 0xffffffff;
    for (const byte of bytes) {
        value ^= byte;
        for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
    return (value ^ 0xffffffff) >>> 0;
};
function chunk(type, value) {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(value.length);
    const body = join(text(type), value);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc(body));
    return join(head, body, tail);
}
function png(...chunks) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2;
    return join([137, 80, 78, 71, 13, 10, 26, 10], chunk('IHDR', header), ...chunks,
        chunk('IDAT', deflateSync(Buffer.from([0, 1, 2, 3]))), chunk('IEND', []));
}
function pngLabel(flag = '1', key = 'AIGC') {
    return chunk('tEXt', join(text(key + '\0'), text(JSON.stringify({ AIGC: label(flag) }))));
}
function xmp(value = label(), prefix = 'TC260', attribute = false) {
    const json = JSON.stringify(value);
    const escaped = json.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    return `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:${prefix}="http://www.tc260.org.cn/ns/AIGC/1.0/"${attribute ? ` ${prefix}:AIGC="${escaped}"/>` : `><${prefix}:AIGC>${json}</${prefix}:AIGC></rdf:Description>`}</rdf:RDF></x:xmpmeta>`;
}
function jpeg(packet) {
    const body = join(text('http://ns.adobe.com/xap/1.0/\0'), text(packet));
    const size = Buffer.alloc(2); size.writeUInt16BE(body.length + 2);
    return join([255, 216, 255, 225], size, body, [255, 217]);
}
function webp(packet) {
    const body = text(packet);
    const size = Buffer.alloc(4); size.writeUInt32LE(body.length);
    const payload = join(text('WEBP'), text('XMP '), size, body, body.length & 1 ? [0] : []);
    const riffSize = Buffer.alloc(4); riffSize.writeUInt32LE(payload.length);
    return join(text('RIFF'), riffSize, payload);
}

test('GB labels preserve provider fields and all three declaration levels', async () => {
    for (const [flag, declaration, confidence] of [['1', 'generated', 'medium'], ['2', 'possible', 'weak'], ['3', 'suspected', 'weak']]) {
        const result = await readAigcMetadata(png(pngLabel(flag)));
        assert.equal(result.status, 'present');
        assert.equal(result.declaration, declaration);
        assert.equal(result.confidence, confidence);
        assert.equal(result.verified, false);
        assert.deepEqual(result.labels[0].fields, label(flag));
    }
});

test('only the complete string schema can provide declaration evidence', () => {
    for (const value of [null, [], { Label: '1' }, { ...label(), Label: 1 },
        { ...label(), Label: '0' }, { ...label(), ProduceID: '' },
        { ...label(), ContentProducer: 'a'.repeat(4097) }, { ...label(), ProduceID: 'x\0y' }]) {
        assert.equal(parseAigcValue(JSON.stringify(value)).valid, false);
    }
    assert.equal(parseAigcValue(JSON.stringify(label())).valid, true);
    assert.equal(parseAigcValue(JSON.stringify({ AIGC: label() })).valid, true);
    assert.equal(parseAigcValue('{broken').valid, false);
    assert.equal(parseAigcValue(' '.repeat(65537)).valid, false);
    assert.deepEqual(parseAigcValue('{"Label":"3","Label":"1"}').issues, ['payload.duplicateKey']);
});

test('XMP uses namespace URI rather than a hard-coded prefix', async () => {
    for (const packet of [xmp(), xmp(label(), 'custom', true), xmp(label(), 'other')]) {
        assert.equal(readAigcXmp(packet).length, 1);
        for (const file of [jpeg(packet), webp(packet), png(chunk('iTXt', join(text('XML:com.adobe.xmp\0'), [0, 0, 0, 0], text(packet))))]) {
            const result = await readAigcMetadata(file);
            assert.equal(result.confidence, 'medium');
            assert.equal(result.labels[0].fields.ContentProducer, '示例生成服务');
        }
    }
});

test('PNG compressed metadata is decoded locally', async () => {
    const json = text(JSON.stringify({ AIGC: label() }));
    for (const block of [
        chunk('zTXt', join(text('AIGC\0'), [0], deflateSync(json))),
        chunk('iTXt', join(text('AIGC\0'), [1, 0, 0, 0], deflateSync(json))),
        chunk('iTXt', join(text('XML:com.adobe.xmp\0'), [1, 0, 0, 0], deflateSync(text(xmp())))),
    ]) assert.equal((await readAigcMetadata(png(block))).confidence, 'medium');
});

test('captions, arbitrary JSON, wrong namespaces and compressed pixels cannot declare provenance', async () => {
    const declaration = JSON.stringify({ AIGC: label() });
    for (const file of [text(declaration), png(chunk('tEXt', text('Description\0' + declaration))),
        jpeg(xmp().replace('http://www.tc260.org.cn/ns/AIGC/1.0/', 'https://example.invalid/')),
        join([255, 216, 255, 218], text(declaration))]) {
        const result = await readAigcMetadata(file, { Description: declaration, Label: '1' });
        assert.equal(result.labels.length, 0);
        assert.equal(result.confidence, null);
    }
    assert.deepEqual(readAigcXmp(`<root><!--${xmp()}--><caption>${declaration}</caption></root>`), []);
    const scoped = `<root xmlns:T="http://www.tc260.org.cn/ns/AIGC/1.0"><child xmlns:T="https://example.invalid"><T:AIGC>${JSON.stringify(label())}</T:AIGC></child></root>`;
    assert.deepEqual(readAigcXmp(scoped), []);
});

test('EXIF UserComment requires an exact AIGC JSON wrapper', async () => {
    const result = await readAigcMetadata(new Uint8Array(), { UserComment: JSON.stringify({ AIGC: label() }) });
    assert.equal(result.confidence, 'medium');
    for (const value of [JSON.stringify(label()), 'About AIGC: ' + JSON.stringify({ AIGC: label() })]) {
        assert.equal((await readAigcMetadata(new Uint8Array(), { UserComment: value })).status, 'absent');
    }
});

test('bad CRC, malformed XML and truncated containers cannot yield medium evidence', async () => {
    const badCrc = pngLabel(); badCrc[badCrc.length - 1] ^= 1;
    const oversized = webp(xmp()); oversized.writeUInt32LE(0xffffffff, 16);
    for (const file of [png(badCrc), png(pngLabel()).subarray(0, -4), jpeg(xmp().slice(0, -1)),
        jpeg(xmp()).subarray(0, -20), jpeg(xmp()).subarray(0, -2), oversized, jpeg(xmp() + '<'),
        jpeg(xmp().replace('<rdf:RDF', '<!DOCTYPE root [<!ENTITY fake "x">]><rdf:RDF'))]) {
        const result = await readAigcMetadata(file);
        assert.notEqual(result.confidence, 'medium');
        assert.ok(result.warnings.length);
    }
});

test('decompression bombs and oversized packets stop at bounded output', async () => {
    const bomb = chunk('zTXt', join(text('AIGC\0'), [0], deflateSync(Buffer.alloc(300000, 32))));
    const large = chunk('tEXt', join(text('AIGC\0'), Buffer.alloc(300000, 32)));
    for (const block of [bomb, large]) {
        const result = await readAigcMetadata(png(block));
        assert.equal(result.confidence, null);
        assert.ok(result.warnings.includes('metadata.limit'));
    }
});

test('identical copies are deduplicated and conflicting copies remain inconclusive', async () => {
    const same = await readAigcMetadata(png(pngLabel(), pngLabel()));
    assert.equal(same.labels.length, 1);
    assert.equal(same.confidence, 'medium');
    const conflict = await readAigcMetadata(png(pngLabel('1'), pngLabel('3')));
    assert.equal(conflict.status, 'conflict');
    assert.equal(conflict.declaration, null);
    assert.equal(conflict.confidence, 'weak');
    const mixed = await readAigcMetadata(png(pngLabel(), chunk('tEXt', text('AIGC\0{"Label":"1"}'))));
    assert.equal(mixed.confidence, 'weak');
});

test('actual detection pipeline separates declared generation from possible and suspected labels', async () => {
    for (const [flag, expected] of [['1', 'provenance'], ['2', 'uncertain'], ['3', 'uncertain']]) {
        const { detections, aigc } = await runAllDetections(png(pngLabel(flag)), { mime: 'image/png' });
        assert.equal(classifyEvidence(detections, null).kind, expected);
        assert.equal(detections.find(item => item.title.includes('TC260')).confidence, aigc.confidence);
    }
});
