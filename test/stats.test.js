import test from 'node:test';
import assert from 'node:assert/strict';

import { isTrackingEnabled, normalizeIncrement } from '../src/stats.js';

test('local development hosts never mutate public counters', () => {
    assert.equal(isTrackingEnabled('127.0.0.1'), false);
    assert.equal(isTrackingEnabled('localhost'), false);
    assert.equal(isTrackingEnabled('863401402.github.io'), true);
});

test('batch counter increments are integer and bounded', () => {
    assert.equal(normalizeIncrement(undefined), 1);
    assert.equal(normalizeIncrement(2.9), 2);
    assert.equal(normalizeIncrement(-5), 0);
    assert.equal(normalizeIncrement(500), 200);
});
