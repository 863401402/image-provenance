# Chinese AIGC image metadata

Implemented on 2026-10-02. `src/aigc.js` reads declarations locally without a
new dependency or a network request. This is metadata interpretation, not a
watermark decoder, identity verifier or certification of standards compliance.

## Supported storage

- JPEG APP1 standard XMP packets.
- PNG `tEXt`, `iTXt` and `zTXt` chunks with an AIGC keyword; PNG XMP in
  `XML:com.adobe.xmp`. Compressed text uses the browser's `DecompressionStream`.
- WebP RIFF `XMP ` chunks, including odd-byte padding.
- An EXIF `UserComment` containing an exact JSON `AIGC` wrapper, when the existing
  exifr metadata reader exposes that comment. This route depends on exifr loading.

XMP properties must use the TC260 namespace
`http://www.tc260.org.cn/ns/AIGC/1.0` (an optional trailing slash is accepted).
The prefix may vary. Scalar element and attribute serialization are supported;
XML entity references and CDATA are handled without resolving external entities.
DTD declarations, complex nested property structures and JPEG Extended XMP are
not supported. HEIF, TIFF and other formats are outside the app's input formats.

## Fields and evidence

The JSON value can be a direct object or wrapped as `{ "AIGC": { ... } }`.
All seven fields must be strings: `Label`, `ContentProducer`, `ProduceID`,
`ReservedCode1`, `ContentPropagator`, `PropagateID`, `ReservedCode2`.
Producer and production ID must be nonempty. Reserved values are displayed but
not decoded, treated as signatures or used to infer provider identity.

| Label | Declaration | Evidence |
| --- | --- | --- |
| `"1"` | AI-generated / synthetic | Medium, editable metadata |
| `"2"` | Possibly AI-generated | Weak, inconclusive |
| `"3"` | Suspected AI-generated | Weak, inconclusive |

Unknown labels, numeric labels, duplicate JSON keys, missing fields, malformed
JSON and oversize fields do not provide declaration evidence. Provider codes
are shown verbatim; they are not mapped to a vendor or model without a verified
registry. No readable declaration does not establish camera origin.

Identical copies are deduplicated. Distinct valid copies are reported as a
conflict, retaining every field and storage location. A valid Label 1 alongside
an invalid copy or parsing warning is downgraded to weak evidence. C2PA evidence
retains its existing higher priority; the AIGC declaration is never marked verified.

## Bounds and reports

Only metadata containers are read; captions and compressed image scan data are
not scanned for AIGC JSON. PNG text CRCs are checked. Container lengths are
bounded by the available bytes. Limits are 10,000 chunks/segments, 16 metadata
packets/entries, 256 KiB per packet or decompressed packet, 1 MiB of input
metadata, 64 KiB per JSON value and 4,096 characters per field. XML nesting is
limited to 32; JSON nesting to 16. Unsupported compression and truncated data
produce warnings, without aborting the rest of the image's analysis.

`analyzeImage()` exposes `report.aigc` and `details.aigc`, including status,
declaration, confidence, `verified: false`, labels, sources, validation issues
and warnings. Existing schema version 1 receives additive fields. Batch CSV
adds AIGC status, declaration, confidence, label JSON and warnings. Batch JSON
also preserves the structured `aigc` object. Single-image cards and batch rows
display the declaration level in Chinese and English.

The tests construct synthetic, standards-shaped metadata containers. They
verify parsing, malformed inputs and evidence levels; they do not measure the
prevalence of labels in actual output from any provider.

## Primary references

- [GB 45438-2025, Annex E](https://www.xiongan.gov.cn/20250617/99e8309670814bdba91b3bcbfaca4e6c/2025061799e8309670814bdba91b3bcbfaca4e6c_38598ff9004470443c9195f1655adb29a0.pdf):
  JSON fields and the three label meanings.
- [TC260 image metadata implementation guide](https://www.tc260.org.cn/front/postDetail.html?id=20250828165129):
  TC260 XMP namespace and image metadata placement.
