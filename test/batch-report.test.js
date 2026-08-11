import test from 'node:test';
import assert from 'node:assert/strict';

import { serializeBatchCsv, serializeBatchJson } from '../src/batch/report.js';

const records = [{
    status: 'completed',
    result: {
        report: {
            mode: 'full',
            verdict: 'unsuitable',
            file: {
                name: 'quoted,"name.jpg', type: 'image/jpeg', size: 42,
                width: 10, height: 20, sha256: 'abc',
            },
            c2pa: { status: 'absent', state: null, verified: false, digitalSourceType: null },
            frequency: {
                applicable: false, confidence: null, score: null,
                suitabilityReasons: ['qrCode', 'lowTexture'],
            },
        },
    },
}, {
    name: 'bad.png', status: 'failed', mode: 'quick', error: new Error('decode failed'),
}, {
    file: { name: 'converted.png', type: 'image/png', size: 100 },
    status: 'completed', operation: 'convert',
    result: {
        conversion: {
            outputName: 'converted_Apple_x.jpg', outputSize: 88,
            width: 20, height: 10, quality: 0.92, backgroundColor: '#ffffff',
            profileMake: 'Apple', profileModel: 'Phone', watermarkDisrupted: true,
        },
    },
}];

test('CSV export escapes values and includes failures', () => {
    const csv = serializeBatchCsv(records);
    assert.ok(csv.startsWith('\uFEFFFile name,Status'));
    assert.match(csv, /"quoted,""name\.jpg"/);
    assert.match(csv, /qrCode\|lowTexture/);
    assert.match(csv, /bad\.png,failed,detect,quick/);
    assert.match(csv, /decode failed/);
    assert.match(csv, /converted_Apple_x\.jpg,88,20,10,0\.92,#ffffff,Apple,Phone,true/);
});

test('JSON export has a stable schema and timestamp', () => {
    const json = JSON.parse(serializeBatchJson(records, '2026-08-12T00:00:00.000Z'));
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.generatedAt, '2026-08-12T00:00:00.000Z');
    assert.equal(json.items.length, 3);
    assert.equal(json.items[0].verdict, 'unsuitable');
    assert.equal(json.items[1].error, 'decode failed');
    assert.equal(json.items[2].operation, 'convert');
});

test('CSV neutralizes spreadsheet formulas in user-controlled fields', () => {
    const csv = serializeBatchCsv([{
        file: { name: '=HYPERLINK("https://example.invalid")', type: 'image/jpeg', size: 1 },
        status: 'failed',
    }]);
    assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.invalid""\)"/);
});
