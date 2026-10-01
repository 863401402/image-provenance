import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveImageMime, escHtml } from '../src/utils.js';

test('image MIME accepts supported declarations and falls back to file extensions', () => {
    assert.equal(resolveImageMime({ name: 'photo.bin', type: 'image/png' }), 'image/png');
    assert.equal(resolveImageMime({ name: 'PHOTO.JPEG', type: '' }), 'image/jpeg');
    assert.equal(resolveImageMime({ name: 'asset.webp' }), 'image/webp');
    assert.equal(resolveImageMime({ name: 'notes.txt', type: '' }), null);
});

test('HTML escaping covers text and quoted attributes without requiring a DOM', () => {
    assert.equal(escHtml(null), '');
    assert.equal(escHtml(0), '0');
    assert.equal(escHtml('" onmouseover="alert(1)\' <img>&'),
        '&quot; onmouseover=&quot;alert(1)&#39; &lt;img&gt;&amp;');
});
