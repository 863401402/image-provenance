# Image Provenance

[![Pages](https://img.shields.io/badge/demo-online-2ea44f)](https://863401402.github.io/image-provenance/?lang=en)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Client-side](https://img.shields.io/badge/100%25-client--side-0071e3)](#)

[中文](README.md) · **English**

> AI image provenance tool. **Runs 100% in your browser — your image never leaves your device.**

👉 [**Open the live demo**](https://863401402.github.io/image-provenance/?lang=en)

---

## Preview

![Detection main view](docs/screenshots/main-light.svg)

![Conversion before/after](docs/screenshots/convert-demo.svg)

## What it does

- **Multi-layer detection** — C2PA / Content Credentials, Google SynthID, OpenAI DALL·E / Sora, Midjourney, Stable Diffusion / Flux, Adobe Firefly and more. Each detection carries a strong/medium/weak confidence tag, and only strong/medium signals flip the top verdict to "HIT".
- **Metadata viewer** — Full EXIF / XMP / IPTC / ICC breakdown, GPS with a privacy warning + OSM link, and the complete XMP editing-history timeline.
- **Frequency analysis** — 65 features extracted inside a Web Worker, a viridis FFT heatmap, normalized radial power spectrum, and a multi-family anomaly heuristic.
- **Image conversion** — Byte-level C2PA strip → EXIF orientation normalization → transparent pixels composited over white → Canvas re-encode → optional watermark processing → camera EXIF injection.
- **Watermark disruption v2** — 8 techniques (including a real 2D-FFT phase perturbation) across 4 presets (Light / Recommended / Strong / Extreme). No rotation, no flip, no aspect-ratio change.
- **Local batch processing** — Add multiple images for quick/full detection or conversion, cancel/retry jobs, and export CSV, JSON, or a manifest-backed ZIP. Images remain on the device.

## Stack

Zero build. A single HTML file plus ES Modules. The official C2PA WebAssembly verifier is vendored; [`exifr`](https://github.com/MikeKovarik/exifr), [`piexifjs`](https://github.com/hMatoba/piexifjs), and [`fflate`](https://github.com/101arrowz/fflate) load from a CDN only when needed. FFT / DCT / DWT, watermark techniques, and frequency features run locally in the browser.

## Batch mode and browser API

Switch the left pane to **Batch** and add JPEG, PNG, or WebP files. Quick detection runs with concurrency 2; full detection and conversion use concurrency 1 to bound Canvas and FFT memory. A queue accepts up to 200 jobs, including no more than 50 conversions. Quick mode checks provenance and metadata, while Full mode also runs frequency analysis.

Self-hosted integrations can call the structured analyzer directly:

```js
import { analyzeImage } from './src/analyzer.js';

const { report, details } = await analyzeImage(file, { mode: 'full' });
console.log(report.verdict, report.c2pa, report.frequency);
```

Batch conversion uses `convertFile()` from `src/batch/converter.js` and returns a JPEG `Blob`, output name, dimensions, effective quality, camera profile, and processing log. See [`docs/TECHNICAL-NOTES.md`](docs/TECHNICAL-NOTES.md) for implementation rationale.

## Run locally

```bash
git clone https://github.com/863401402/image-provenance
cd image-provenance
python3 -m http.server 8000   # open http://localhost:8000
npm test                      # run Node unit tests
```

ES Modules + Web Workers require HTTP — `file://` will not load.

## Accuracy & ethics

**This is not a calibrated classifier.** [Corvi et al. 2023](https://arxiv.org/abs/2304.06408) documents spectral and spatial anomalies in generated imagery, while [AIDE 2024](https://arxiv.org/abs/2406.19435) shows that off-the-shelf detectors still fail heavily on realistic, unseen generated images. Frequency output therefore describes anomaly strength, not proof of AI generation; verified C2PA provenance should take priority.

**Watermark disruption** is for research: privacy de-identification and academic robustness evaluation. **Not endorsed** for disinformation, impersonation, or fraud. Position aligned with [WAVES (NeurIPS 2024)](https://arxiv.org/abs/2401.08573).

## Community

Open a [GitHub Issue](https://github.com/863401402/image-provenance/issues) for bug reports / feature requests, or start a [Discussion](https://github.com/863401402/image-provenance/discussions) for broader questions.

## License

[MIT](LICENSE)
