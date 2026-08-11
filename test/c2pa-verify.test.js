import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeValidationStore, isAiSourceType } from '../src/c2pa-verify.js';

test('trusted manifest with no failures is verified', () => {
    const summary = summarizeValidationStore({
        active_manifest: 'example:urn:uuid:1',
        validation_state: 'Trusted',
        validation_results: { activeManifest: { success: [{ code: 'claimSignature.validated' }], informational: [], failure: [] } },
    }, {
        claim_generator: 'Example/1.0',
        assertions: [{ label: 'c2pa.actions', data: { digitalSourceType: 'trainedAlgorithmicMedia' } }],
    });

    assert.equal(summary.verified, true);
    assert.equal(summary.trusted, true);
    assert.equal(summary.digitalSourceType, 'trainedAlgorithmicMedia');
});

test('validation failures always make a manifest invalid', () => {
    const summary = summarizeValidationStore({
        validation_state: 'Valid',
        validation_results: { activeManifest: { success: [], informational: [], failure: [{ code: 'assertion.dataHash.mismatch' }] } },
    });
    assert.equal(summary.verified, false);
    assert.equal(summary.invalid, true);
});

test('an untrusted signer can still have a cryptographically valid manifest', () => {
    const summary = summarizeValidationStore({
        validation_state: 'Valid',
        validation_status: [{ code: 'signingCredential.untrusted' }],
        validation_results: {
            activeManifest: {
                success: [{ code: 'claimSignature.validated' }, { code: 'assertion.dataHash.match' }],
                informational: [],
                failure: [{ code: 'signingCredential.untrusted' }],
            },
        },
    });
    assert.equal(summary.verified, true);
    assert.equal(summary.trusted, false);
    assert.equal(summary.invalid, false);
    assert.equal(summary.integrityFailures.length, 0);
    assert.equal(summary.success.some(status => status.code === 'signingCredential.untrusted'), false);
});

test('AI source type matching is explicit', () => {
    assert.equal(isAiSourceType('trainedAlgorithmicMedia'), true);
    assert.equal(isAiSourceType('digitalCapture'), false);
});

test('source type is read only from its structured field', () => {
    const structured = summarizeValidationStore({}, {
        assertions: [{ data: { digital_source_type: 'http://example/trainedAlgorithmicMedia' } }],
    });
    const incidental = summarizeValidationStore({}, {
        description: 'This text mentions trainedAlgorithmicMedia without declaring it.',
    });
    assert.equal(structured.digitalSourceType, 'trainedAlgorithmicMedia');
    assert.equal(incidental.digitalSourceType, null);
});
