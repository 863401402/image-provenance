import test from 'node:test';
import assert from 'node:assert/strict';
import { getAiGenerationHints } from '../src/metadata.js';
import { findWithContext, runAllDetections } from '../src/detect.js';
import { hasVerifiedAiSource, summarizeValidationStore } from '../src/c2pa-verify.js';
import { classifyEvidence } from '../src/verdict.js';

test('AI names in captions, authors and camera models are not generator evidence', () => {
    assert.deepEqual(getAiGenerationHints({
        Description: 'A screenshot about OpenAI and Midjourney',
        Creator: 'OpenAI', Model: 'Flux', XMPToolkit: 'Gemini',
    }), []);
});

test('generator fields recognize known tools without treating DALL substrings as tools', () => {
    assert.equal(getAiGenerationHints({ Software: 'ComfyUI' }).length, 1);
    assert.equal(getAiGenerationHints({ CreatorTool: 'Stable_Diffusion' }).length, 1);
    assert.equal(getAiGenerationHints({ Software: 'DALL-E 3' }).length, 1);
    assert.deepEqual(getAiGenerationHints({ Software: 'Dallington photo editor' }), []);
});

test('AI source types require exact enum or URI leaf values', () => {
    assert.equal(getAiGenerationHints({ DigitalSourceType:
        'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia' }).length, 1);
    assert.deepEqual(getAiGenerationHints({ DigitalSourceType: 'not-trainedAlgorithmicMedia' }), []);
    assert.deepEqual(getAiGenerationHints({ DigitalSourceType: 'digitalCapture' }), []);
});

test('keyword matching ignores casing and de-duplicates case variants', () => {
    const found = findWithContext('image made with OPENAI', ['OpenAI', 'openai']);
    assert.equal(found.length, 1);
    assert.match(found[0].context, /OPENAI/);
});

test('unstructured byte hints cannot produce a provenance verdict', () => {
    assert.equal(classifyEvidence([{ hit: true, confidence: 'weak', category: 'ai' }], null).kind, 'uncertain');
});

test('byte-only AI marker is weak in the actual detection pipeline', async () => {
    const { detections } = await runAllDetections(new TextEncoder().encode('OPENAI image bytes'));
    assert.equal(detections.find(item => item.title.startsWith('OpenAI')).confidence, 'weak');
    assert.equal(classifyEvidence(detections, null).kind, 'uncertain');
});

test('verified manifest requires its own explicit AI source type', () => {
    assert.equal(hasVerifiedAiSource({ verified: true }), false);
    assert.equal(hasVerifiedAiSource({ verified: false, digitalSourceType: 'trainedAlgorithmicMedia' }), false);
    assert.equal(hasVerifiedAiSource({ verified: true, digitalSourceType: 'trainedAlgorithmicMedia' }), true);
    const summary = summarizeValidationStore({ validation_state: 'Trusted' }, {
        digitalSourceType: 'not-trainedAlgorithmicMedia',
    });
    assert.equal(summary.digitalSourceType, null);
    assert.equal(hasVerifiedAiSource(summary), false);
});

test('current image tools are recognized only in generation fields', () => {
    for (const tool of ['Seedream 4.0', 'Doubao', '豆包', '即梦', 'ChatGPT',
        'Nano Banana Pro', 'Qwen-Image', 'HunyuanImage 3.0', 'gpt-image-2']) {
        assert.equal(getAiGenerationHints({ Software: tool }).length, 1, tool);
        assert.deepEqual(getAiGenerationHints({ Description: tool }), [], tool);
    }
});

test('non-generative IPTC types never declare AI provenance', () => {
    for (const type of ['algorithmicMedia', 'dataDrivenMedia', 'computationalCapture',
        'screenCapture', 'algorithmicallyEnhanced', 'humanEdits', 'composite']) {
        assert.deepEqual(getAiGenerationHints({ DigitalSourceType: type }), [], type);
        assert.equal(hasVerifiedAiSource({ verified: true, digitalSourceType: type }), false, type);
    }
});

test('Chinese byte markers remain weak and compressed byte statistics are informational', async () => {
    const bytes = new Uint8Array(4096);
    bytes.set(new TextEncoder().encode('豆包 即梦'));
    const { detections } = await runAllDetections(bytes);
    assert.equal(detections.find(item => item.title.startsWith('ByteDance')).confidence, 'weak');
    const stats = detections.at(-1);
    assert.equal(stats.hit, false);
    assert.equal(stats.confidence, 'info');
    assert.equal(classifyEvidence([stats], null).kind, 'none');
});
