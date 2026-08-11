# Analysis and Conversion Notes

## Frequency Analysis

The radial profile keeps two quantities separate: annulus power for energy ratios and mean power density for plots and log-log slope fitting. DC is excluded from every AC ratio and from spectral entropy. The three broad bands and seven fine bands each partition AC power, so their ratios sum to approximately one. Shannon entropy is divided by the logarithm of the number of non-empty AC bins and remains in `[0, 1]`.

Inputs are decoded with browser orientation handling and center-cropped to a square before resizing. This avoids anisotropic stretching that would create artificial directional structure. Fourier centrosymmetry is retained only as a transform check: it follows from conjugate symmetry for any real-valued image and is not AI evidence.

The score is deliberately uncalibrated. A medium result requires positive rules from at least two independent feature families; a strong result requires three. QR codes, documents, low-texture images, and interface-like graphics do not receive a frequency verdict.

Research basis:

- [Corvi et al., 2023](https://arxiv.org/abs/2304.06408) studies radial/angular power spectra and warns that real-world traces and training-data artifacts complicate detection.
- [Yan et al., 2024 (AIDE)](https://arxiv.org/abs/2406.19435) reports poor generalization of existing detectors on challenging unseen images and combines low-level frequency patches with semantic features.

## Conversion

`createImageBitmap()` is called with `imageOrientation: "from-image"`. The decoded pixels are already oriented according to EXIF, so the output EXIF orientation is always `1`; manual rotation would apply orientation twice. PNG/WebP alpha is explicitly composited onto white before JPEG encoding. Quality is normalized to the Canvas `[0, 1]` range.

Conversion rejects inputs over 100 MB, dimensions over 16,384 px, and decoded images over 50 million pixels. Full frequency analysis and conversion stay at concurrency one; quick detection uses two workers. A queue accepts 200 jobs overall and at most 50 conversions. Each Canvas backing store is released after encoding.

Browser basis:

- [MDN: `createImageBitmap()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
- [WHATWG HTML: ImageBitmap](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html)
