import test from 'node:test';
import assert from 'node:assert/strict';

import { runBatchQueue } from '../src/batch/queue.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('batch queue preserves order and caps concurrency', async () => {
    let active = 0;
    let peak = 0;
    const states = [];
    const results = await runBatchQueue([3, 1, 2, 4], async value => {
        active++;
        peak = Math.max(peak, active);
        await delay(value * 2);
        active--;
        return value * 10;
    }, {
        concurrency: 2,
        onUpdate: state => states.push(`${state.index}:${state.status}`),
    });

    assert.equal(peak, 2);
    assert.deepEqual(results.map(item => item.result), [30, 10, 20, 40]);
    assert.ok(states.includes('0:running'));
    assert.ok(states.includes('3:completed'));
});

test('one failure does not stop the remaining files', async () => {
    const results = await runBatchQueue(['ok', 'bad', 'later'], async value => {
        if (value === 'bad') throw new Error('broken image');
        return value.toUpperCase();
    });

    assert.deepEqual(results.map(item => item.status), ['completed', 'failed', 'completed']);
    assert.equal(results[1].error.message, 'broken image');
    assert.equal(results[2].result, 'LATER');
});

test('abort cancels running and pending files', async () => {
    const controller = new AbortController();
    const results = await runBatchQueue([1, 2, 3], async value => {
        if (value === 1) controller.abort();
        await delay(1);
        return value;
    }, { concurrency: 1, signal: controller.signal });

    assert.deepEqual(results.map(item => item.status), ['canceled', 'canceled', 'canceled']);
});

test('concurrency is clamped to at least one worker', async () => {
    const results = await runBatchQueue([1, 2], async value => value, { concurrency: 0 });
    assert.deepEqual(results.map(item => item.status), ['completed', 'completed']);
});

test('worker receives item, index, and AbortSignal in distinct arguments', async () => {
    const controller = new AbortController();
    const received = [];
    await runBatchQueue(['first', 'second'], async (item, index, signal) => {
        received.push({ item, index, signal });
    }, { concurrency: 1, signal: controller.signal });

    assert.deepEqual(received.map(({ item, index }) => [item, index]), [['first', 0], ['second', 1]]);
    assert.ok(received.every(entry => entry.signal === controller.signal));
});
