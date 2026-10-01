import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMetadataEvidence, normalizeGpsCoordinate } from '../src/metadata-evidence.js';
import { renderMetadataPanel } from '../src/panel-metadata.js';
import { t } from '../src/i18n.js';

test('metadata summary uses exact source types and the verified manifest rather than byte clues', () => {
    for (const type of ['algorithmicMedia', 'dataDrivenMedia', 'computationalCapture', 'digitalCapture']) {
        assert.equal(analyzeMetadataEvidence({}, { verification: { verified: true, digitalSourceType: type } }).kind, 'verifiedSource');
    }
    assert.equal(analyzeMetadataEvidence({}, { digitalSourceType: 'trainedAlgorithmicMedia',
        verification: { verified: true } }).kind, 'verifiedSource');
    assert.equal(analyzeMetadataEvidence({}, { verification: { verified: true,
        digitalSourceType: 'compositeWithTrainedAlgorithmicMedia' } }).kind, 'verifiedAi');
    assert.equal(analyzeMetadataEvidence({}, { verification: { invalid: true,
        digitalSourceType: 'trainedAlgorithmicMedia' } }).kind, 'invalid');
});

test('metadata summary shares tool matching and never treats full camera EXIF as proof of capture', () => {
    assert.equal(analyzeMetadataEvidence({ Software: 'Dallington Photo Editor' }).kind, 'present');
    assert.equal(analyzeMetadataEvidence({ Description: 'OpenAI', Creator: 'Gemini' }).kind, 'present');
    for (const tool of ['Seedream', 'Qwen-Image', '豆包', 'ComfyUI']) {
        assert.equal(analyzeMetadataEvidence({ CreatorTool: tool }).kind, 'toolAi');
    }
    const result = analyzeMetadataEvidence({ Make: 'Example', Model: 'Camera', LensModel: 'Lens',
        FNumber: 2.8, ExposureTime: 0.01, ISO: 100, MakerNote: 'editable', latitude: 31 });
    assert.equal(result.kind, 'camera');
    assert.equal(result.level, 'none');
});

test('AIGC possible, suspected and conflicting labels take precedence over camera fields', () => {
    for (const declaration of ['possible', 'suspected', null]) {
        assert.equal(analyzeMetadataEvidence({ Make: 'Example', Model: 'Camera' }, {}, {
            confidence: 'weak', declaration,
        }).kind, 'uncertain');
    }
    assert.equal(analyzeMetadataEvidence({}, {}, { confidence: 'medium', declaration: 'generated' }).kind, 'declaredAi');
    assert.equal(analyzeMetadataEvidence({}, {}, { status: 'unreadable' }).kind, 'unreadable');
    assert.equal(analyzeMetadataEvidence({ _error: 'parser unavailable' }).kind, 'unreadable');
    assert.equal(analyzeMetadataEvidence({}).kind, 'none');
});

test('GPS coordinates normalize DMS and reject malformed or out-of-range values', () => {
    assert.equal(normalizeGpsCoordinate([31, 30, 0], 'S', 90), -31.5);
    assert.equal(normalizeGpsCoordinate('121.5', 'W', 180), -121.5);
    assert.equal(normalizeGpsCoordinate(0, 'N', 90), 0);
    for (const value of [null, {}, [], [1, 60, 0], [1, 0, 60], 'bad', '', NaN, Infinity, 91]) {
        assert.equal(normalizeGpsCoordinate(value, null, 90), null);
    }
});

test('metadata rendering separates signer trust, preserves AIGC fields and escapes field contents', () => {
    const container = { innerHTML: '' };
    renderMetadataPanel(container, { meta: {}, jumbf: { verification: {
        present: true, verified: true, trusted: false, digitalSourceType: 'algorithmicMedia',
    } }, aigc: { status: 'present', declaration: 'possible', confidence: 'weak', labels: [{
        fields: { Label: '2', ContentProducer: '<img src=x onerror=alert(1)>', ProduceID: 'image-123' },
        sources: ['png.tEXt'], issues: [],
    }], warnings: [] } });
    assert.ok(container.innerHTML.includes(t('meta.signerTrust')));
    assert.ok(container.innerHTML.includes(t('meta.trustUnconfirmed')));
    assert.ok(container.innerHTML.includes(t('meta.evidence.uncertain.title')));
    assert.ok(container.innerHTML.includes('image-123'));
    assert.ok(container.innerHTML.includes('&lt;img'));
    assert.equal(container.innerHTML.includes('<img src=x'), false);
    assert.equal(container.innerHTML.includes(t('meta.empty')), false);
});

test('malformed GPS, history and dates do not prevent metadata rendering', () => {
    const container = { innerHTML: '' };
    renderMetadataPanel(container, { meta: { GPSLatitude: 'bad', GPSLongitude: {},
        DateTimeOriginal: new Date('invalid'), History: [null, 'bad', { action: 'saved' }] } });
    assert.ok(container.innerHTML.includes('saved'));
    assert.equal(container.innerHTML.includes('openstreetmap.org'), false);
    renderMetadataPanel(container, { meta: { GPSLatitude: [31, 30, 0], GPSLongitude: [121, 30, 0], GPSLatitudeRef: 'N' } });
    assert.ok(container.innerHTML.includes('31.500000, 121.500000'));
});
