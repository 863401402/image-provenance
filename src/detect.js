// Provenance detection: JUMBF + structured metadata + byte-level keyword search.
// Returns a list of detection cards plus a merged metadata snapshot.

import { bytesToString } from './utils.js';
import { parseMetadata, sniffJumbf, getGenerationHints, getAiGenerationHints } from './metadata.js';
import { detectWatermarkFFT } from './watermark-detect.js';
import { MARKERS } from './markers.js';
import { verifyC2pa, hasVerifiedAiSource } from './c2pa-verify.js';
import { t } from './i18n.js';
import { readAigcMetadata } from './aigc.js';

export function findWithContext(str, keywords) {
    const results = [];
    const seen = new Set();
    const searchable = str.toLowerCase();
    for (const kw of keywords) {
        const lk = kw.toLowerCase();
        if (seen.has(lk)) continue;
        const idx = searchable.indexOf(lk);
        if (idx !== -1) {
            seen.add(lk);
            const start = Math.max(0, idx - 30);
            const end = Math.min(str.length, idx + kw.length + 30);
            const context = str.substring(start, end).replace(/[\x00-\x08\x0e-\x1f]/g, '.');
            results.push({ keyword: kw, context });
        }
    }
    return results;
}

function detailOf(found) {
    return found.map(f => `[${f.keyword}] …${f.context}…`).join('\n');
}

function card(title, hit, badgeText, desc, detail, confidence) {
    return {
        title, hit,
        badgeText,
        badgeClass: hit ? 'badge-hit' : 'badge-clean',
        desc,
        detail: detail || null,
        confidence: confidence || null,
    };
}

export async function runAllDetections(uint8, { mime = 'image/jpeg' } = {}) {
    // Preserve binary ASCII clues and decode UTF-8 metadata for Chinese tool names.
    const str = bytesToString(uint8) + '\n' + new TextDecoder().decode(uint8);
    const jumbf = sniffJumbf(uint8);
    const [meta, c2pa] = await Promise.all([
        parseMetadata(uint8),
        jumbf.present ? verifyC2pa(uint8, mime) : Promise.resolve({ status: 'absent', present: false }),
    ]);
    const detections = [];
    const aigc = await readAigcMetadata(uint8, meta);

    // Editable GB / TC260 declarations: Label 2/3 and conflicting records stay weak.
    const aigcHit = aigc.labels.some(label => label.valid);
    const aigcState = aigc.status === 'present' ? aigc.declaration : aigc.status;
    const aigcDetails = aigc.labels.map(label => [
        ...Object.entries(label.fields).map(([key, value]) => `${t('det.aigc.field.' + key)}: ${value || '—'}`),
        `${t('det.aigc.field.location')}: ${label.sources.join(', ')}`,
        label.issues.length ? `${t('det.aigc.field.issues')}: ${label.issues.join(', ')}` : null,
    ].filter(Boolean).join('\n'));
    if (aigc.warnings.length) aigcDetails.push(`${t('det.aigc.field.issues')}: ${aigc.warnings.join(', ')}`);
    detections.push({
        ...card(t('det.aigc.title'), aigcHit, t('det.aigc.' + aigcState),
            t('det.aigc.description'),
            aigcDetails.join('\n\n') || null,
            aigc.confidence || (aigc.status === 'absent' ? null : 'info')),
        category: 'provenance',
        aiEvidence: aigcHit,
        badgeClass: aigc.confidence === 'medium' ? 'badge-hit'
            : aigc.status === 'absent' ? 'badge-clean' : 'badge-uncertain',
    });

    // --- 1. C2PA (structured: JUMBF box + DigitalSourceType) ---
    {
        const m = MARKERS.find(x => x.id === 'c2pa');
        const found = findWithContext(str, m.keywords);
        const sourceType = c2pa.digitalSourceType || jumbf.digitalSourceType;
        const verifiedAi = hasVerifiedAiSource(c2pa);
        const hit = c2pa.present || jumbf.present || found.length > 0;
        let badgeText, desc, confidence, badgeClass;
        if (verifiedAi) {
            badgeText = t('badge.c2pa.aiVerified', { state: c2pa.state, source: sourceType });
            desc = t('det.desc.c2pa.aiVerified');
            confidence = 'strong';
            badgeClass = 'badge-hit';
        } else if (c2pa.invalid) {
            badgeText = t('badge.c2pa.invalid');
            desc = t('det.desc.c2pa.invalid');
            confidence = 'info';
            badgeClass = 'badge-hit';
        } else if (c2pa.verified) {
            badgeText = t('badge.c2pa.verified', { state: c2pa.state });
            desc = t('det.desc.c2pa.verified');
            confidence = 'info';
            badgeClass = 'badge-clean';
        } else if (jumbf.present) {
            badgeText = t('badge.c2pa.structure');
            desc = t('det.desc.c2pa.structure');
            confidence = 'weak';
            badgeClass = 'badge-uncertain';
        } else if (found.length > 0) {
            badgeText = t('badge.bytesC2PA');
            desc = t('det.desc.c2pa.bytes');
            confidence = 'weak';
            badgeClass = 'badge-uncertain';
        } else {
            badgeText = t('badge.notfound');
            desc = m.missDesc;
            badgeClass = 'badge-clean';
        }
        const details = [];
        if (jumbf.present) details.push(`JUMBF boxes: ${jumbf.indices.length}  |  labels: ${jumbf.labels.join(', ') || '-'}`);
        if (c2pa.present) {
            details.push([
                `Validation state: ${c2pa.state || c2pa.status}`,
                `DigitalSourceType: ${sourceType || '-'}`,
                `Claim generator: ${c2pa.claimGenerator || '-'}`,
                `Active manifest: ${c2pa.activeLabel || '-'}`,
                `Success: ${(c2pa.success || []).map(s => s.code).join(', ') || '-'}`,
                `Failures: ${(c2pa.failure || []).map(s => s.code).join(', ') || '-'}`,
            ].join('\n'));
        }
        if (found.length) details.push(detailOf(found));
        detections.push({
            ...card(m.title, hit, badgeText, desc, details.join('\n\n') || null, confidence),
            badgeClass,
            category: 'provenance',
            aiEvidence: verifiedAi,
        });
    }

    // --- 2. Structured metadata (EXIF/XMP/IPTC/ICC via exifr) ---
    {
        const hints = getGenerationHints(meta);
        const hit = getAiGenerationHints(meta).length > 0;
        const hasAny = hints.length > 0;
        const metaLine = hints.map(h => `${h.label}: ${h.value}`).join('\n');
        detections.push(card(
            '结构化元数据 (EXIF / XMP / IPTC)',
            hit,
            hit ? '元数据命中 AI 生成工具' : hasAny ? '存在元数据,但未命中 AI' : '无可读元数据',
            hit ? '图片元数据字段直接记录了 AI 生成工具或标记。'
                : hasAny ? '提取到的元数据字段未匹配 AI 生成标记。'
                : '图片几乎不含元数据(可能被剥离)。',
            metaLine || null,
            hit ? 'medium' : null,
        ));
    }

    // --- 3-7. Keyword-based per-vendor markers ---
    for (const m of MARKERS) {
        if (m.id === 'c2pa') continue; // handled above
        const found = findWithContext(str, m.keywords);
        const threshold = m.hitThreshold || 1;
        const hit = found.length >= threshold;
        const isEdit = m.category === 'edit';
        detections.push({
            ...card(
                ['bytedance', 'qwen'].includes(m.id) ? t('det.title.' + m.id) : m.title, hit,
                hit ? (isEdit ? '发现修图痕迹' : t('badge.markerFound')) : t('badge.notfound'),
                hit ? t(isEdit ? 'det.cardEditHits' : 'det.cardKwHits', { list: found.map(f => f.keyword).join(', ') })
                    : ['bytedance', 'qwen'].includes(m.id) ? t('det.desc.' + m.id + '.miss') : m.missDesc,
                found.length ? detailOf(found) : null,
                hit ? (isEdit ? 'info' : 'weak') : null,
            ),
            category: m.category || 'ai',
        });
    }

    // --- 8. Byte-level invisible watermark heuristic ---
    {
        const wm = detectWatermarkFFT(uint8);
        detections.push(card(
            t('det.title.wm'),
            false,
            wm.applicable === false ? t('det.watermark.insufficient')
                : t('det.watermark.statistics'),
            wm.applicable === false ? t('det.watermark.insufficientDesc') : wm.suspicious
                ? t('det.desc.wm.suspect')
                : t('det.desc.wm.clean'),
            `异常度: ${wm.score}%\n高频比: ${wm.highFreqRatio.toFixed(4)}\n中频峰值: ${wm.midFreqPeaks}\nLSB偏移: ${wm.lsbBias.toFixed(4)}`,
            'info',
        ));
    }

    return {
        detections,
        meta,
        aigc,
        jumbf: {
            ...jumbf,
            digitalSourceType: c2pa.digitalSourceType || jumbf.digitalSourceType,
            verification: c2pa,
        },
    };
}
