import test from 'node:test';
import assert from 'node:assert/strict';

import { conversionFileName } from '../src/batch/converter.js';
import { attachArchiveNames, uniqueArchiveNames } from '../src/batch/zip.js';

test('conversion output names remove unsafe path characters', () => {
    assert.equal(
        conversionFileName('a:b/c?.png', 'Apple Inc.', 'fixed'),
        'a_b_c__Apple_Inc__fixed.jpg',
    );
});

test('ZIP manifest maps renamed entries to their actual archive paths', () => {
    const names = uniqueArchiveNames(['same.jpg', 'SAME.jpg']);
    const manifest = attachArchiveNames({ items: [{ outputName: 'same.jpg' }, { outputName: 'SAME.jpg' }] }, names);
    assert.deepEqual(manifest.items.map(item => item.archiveName), ['same.jpg', 'SAME-2.jpg']);
});

test('ZIP entry names are safe and case-insensitively unique', () => {
    assert.deepEqual(
        uniqueArchiveNames(['same.jpg', 'SAME.jpg', '../bad:name.jpg', 'same.jpg']),
        ['same.jpg', 'SAME-2.jpg', '.._bad_name.jpg', 'same-3.jpg'],
    );
});
