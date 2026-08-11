# Vendored C2PA Web SDK

These files are copied from `@contentauth/c2pa-web@0.13.4` so C2PA
verification works without a third-party CDN:

- `c2pa-web.js`: browser SDK bundle (`dist/c2pa-Di8FrHc6.js`)
- `c2pa_worker.js`: SDK web worker
- `c2pa_bg.wasm`: official `c2pa-rs` WebAssembly verifier

Source: <https://github.com/contentauth/c2pa-js>

The package and `@contentauth/c2pa-wasm@0.11.2` are MIT licensed; see
`LICENSE`. The JavaScript bundle also contains the following ISC-licensed
runtime dependencies:

- `highgain@0.1.0`, copyright Eli Mensch
- `ts-deepmerge@8.0.0`, copyright Raice Hannay

ISC permission notice: Permission to use, copy, modify, and/or distribute
this software for any purpose with or without fee is hereby granted, provided
that the above copyright notice and this permission notice appear in all
copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER
RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE
USE OR PERFORMANCE OF THIS SOFTWARE.
