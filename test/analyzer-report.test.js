import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnalysisReport } from '../src/analyzer.js';

const file = { name: 'sample.jpg', type: 'image/jpeg', size: 123 };
const dimensions = { width: 800, height: 600 };

test('analysis report exposes verified AI provenance', () => {
    const report = createAnalysisReport({
        file, dimensions, hash: 'deadbeef', mode: 'quick', meta: {}, frequency: null,
        detections: [{ hit: true, title: 'C2PA', category: 'provenance', confidence: 'strong' }],
        jumbf: {
            present: true,
            digitalSourceType: 'algorithmicMedia',
            verification: {
                present: true, status: 'valid', state: 'Valid', verified: true,
                trusted: false, invalid: false, claimGenerator: 'fixture/1.0',
                failure: [{ code: 'signingCredential.untrusted' }],
            },
        },
    });

    assert.equal(report.verdict, 'provenance');
    assert.equal(report.c2pa.verified, true);
    assert.equal(report.c2pa.digitalSourceType, 'algorithmicMedia');
    assert.deepEqual(report.c2pa.failures, ['signingCredential.untrusted']);
});

test('analysis report marks unsuitable frequency input without retaining visualizations', () => {
    const report = createAnalysisReport({
        file, dimensions, hash: 'deadbeef', mode: 'full', meta: {}, detections: [],
        jumbf: { present: false, verification: { status: 'absent', present: false } },
        frequency: {
            skipped: true,
            score: { applicable: false, confidence: null, total: 0, positive: 0, negative: 0 },
            suitability: { suitable: false, reasons: ['qrCode'] },
            viz: { shouldNotLeak: true },
        },
    });

    assert.equal(report.verdict, 'unsuitable');
    assert.equal(report.frequency.applicable, false);
    assert.deepEqual(report.frequency.suitabilityReasons, ['qrCode']);
    assert.equal('viz' in report.frequency, false);
});
