import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyEvidence } from '../src/verdict.js';

const detection = (confidence, category = 'ai', hit = true) => ({ confidence, category, hit });

test('provenance evidence takes priority over pixel heuristics', () => {
    const result = classifyEvidence([detection('strong')], { confidence: 'info' });
    assert.equal(result.kind, 'provenance');
});

test('unverified C2PA structure is not treated as AI evidence', () => {
    const result = classifyEvidence([
        { hit: true, confidence: 'strong', category: 'provenance', aiEvidence: false },
    ], { confidence: 'info' });
    assert.equal(result.kind, 'none');
});

test('strong and medium frequency scores surface stripped-image evidence', () => {
    assert.equal(classifyEvidence([], { confidence: 'strong' }).kind, 'pixel');
    assert.equal(classifyEvidence([], { confidence: 'medium' }).kind, 'pixel');
});

test('weak evidence remains inconclusive', () => {
    assert.equal(classifyEvidence([detection('weak')], { confidence: null }).kind, 'uncertain');
    assert.equal(classifyEvidence([], { confidence: 'weak' }).kind, 'uncertain');
});

test('missing evidence is not labeled clean', () => {
    assert.equal(classifyEvidence([], { confidence: 'info' }).kind, 'none');
    assert.equal(classifyEvidence([], null).kind, 'none');
});

test('pending pixel analysis has a distinct state', () => {
    assert.equal(classifyEvidence([]).kind, 'pending');
});

test('unsuitable pixel content does not receive an AI verdict', () => {
    assert.equal(classifyEvidence([], { applicable: false, confidence: 'strong' }).kind, 'unsuitable');
});
