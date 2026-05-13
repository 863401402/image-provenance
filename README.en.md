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
- **Frequency analysis** — 65 features extracted inside a Web Worker, viridis-mapped FFT heatmap, log-log radial power spectrum, and a 12-rule weighted heuristic verdict.
- **Image conversion** — Byte-level C2PA strip → Canvas re-encode (wipes all remaining metadata) → optional watermark disruption → inject EXIF for one of 17 real camera profiles (iPhone 17 Pro Max, Sony α1 II, Leica Q3, and more).
- **Watermark disruption v2** — 8 techniques (including a real 2D-FFT phase perturbation) across 4 presets (Light / Recommended / Strong / Extreme). No rotation, no flip, no aspect-ratio change.

## Stack

Zero build. A single HTML file plus ES Modules. Only two CDN dependencies: [`exifr`](https://github.com/MikeKovarik/exifr) for metadata parsing and [`piexifjs`](https://github.com/hMatoba/piexifjs) for EXIF injection. Everything else is handwritten — FFT / DCT / DWT, JUMBF sniffer, the 8 watermark-disruption techniques, the 65 features.

## Run locally

```bash
git clone https://github.com/863401402/image-provenance
cd image-provenance
python3 -m http.server 8000   # open http://localhost:8000
```

ES Modules + Web Workers require HTTP — `file://` will not load.

## Accuracy & ethics

**This is not a deep-learning classifier.** Per [Corvi et al. 2023](https://arxiv.org/abs/2304.06408), frequency-only classification on modern diffusion models (SD / SDXL / Flux / DALL·E 3 / Gemini / Nano Banana) caps around **70-85%** accuracy. The tool's value is layered: strong signals almost never miss (direct C2PA / EXIF declarations); medium signals are suggestive; frequency analysis is shown as visualizations and rule traces, not as a black-box score to trust blindly.

**Watermark disruption** is for research: privacy de-identification and academic robustness evaluation. **Not endorsed** for disinformation, impersonation, or fraud. Position aligned with [WAVES (NeurIPS 2024)](https://arxiv.org/abs/2401.08573).

## Community

Open a [GitHub Issue](https://github.com/863401402/image-provenance/issues) for bug reports / feature requests, or start a [Discussion](https://github.com/863401402/image-provenance/discussions) for broader questions.

## License

[MIT](LICENSE)
