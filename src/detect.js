// Provenance detection: JUMBF + structured metadata + byte-level keyword search.
// Returns a list of detection cards plus a merged metadata snapshot.

import { bytesToString } from './utils.js';
import { parseMetadata, sniffJumbf, getGenerationHints } from './metadata.js';
import { detectWatermarkFFT } from './watermark-detect.js';
import { MARKERS } from './markers.js';
import { verifyC2pa, isAiSourceType } from './c2pa-verify.js';
import { t } from './i18n.js';

function findWithContext(str, keywords) {
    const results = [];
    const seen = new Set();
    for (const kw of keywords) {
        const lk = kw.toLowerCase();
        if (seen.has(lk)) continue;
        const idx = str.indexOf(kw);
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
    const str = bytesToString(uint8);
    const jumbf = sniffJumbf(uint8);
    const [meta, c2pa] = await Promise.all([
        parseMetadata(uint8),
        jumbf.present ? verifyC2pa(uint8, mime) : Promise.resolve({ status: 'absent', present: false }),
    ]);
    const detections = [];

    // --- 1. C2PA (structured: JUMBF box + DigitalSourceType) ---
    {
        const m = MARKERS.find(x => x.id === 'c2pa');
        const found = findWithContext(str, m.keywords);
        const sourceType = c2pa.digitalSourceType || jumbf.digitalSourceType;
        const verifiedAi = c2pa.verified && isAiSourceType(sourceType);
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
        const aiStrings = /Gemini|Imagen|SynthID|Midjourney|Stable\s*Diffusion|ComfyUI|DALL|OpenAI|Firefly|Adobe Firefly|trainedAlgorithmicMedia/i;
        const hit = hints.some(h => aiStrings.test(String(h.value)));
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
            hit ? 'strong' : null,
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
                m.title, hit,
                hit ? (isEdit ? '发现修图痕迹' : '发现标记') : '未发现',
                hit ? m.hitDesc(found) : m.missDesc,
                found.length ? detailOf(found) : null,
                hit ? (isEdit ? 'info' : 'medium') : null,
            ),
            category: m.category || 'ai',
        });
    }

    // --- 8. Byte-level invisible watermark heuristic ---
    {
        const wm = detectWatermarkFFT(uint8);
        detections.push(card(
            '像素级隐形水印(字节级启发)',
            wm.suspicious,
            wm.suspicious ? `疑似水印 (异常度 ${wm.score}%)` : '未检测到异常',
            wm.suspicious
                ? '字节分布偏离自然图像模型,可能存在隐形水印。完整频域分析将在"频域"tab 提供。'
                : '字节分布符合自然图像特征,未发现明显水印痕迹。',
            `异常度: ${wm.score}%\n高频比: ${wm.highFreqRatio.toFixed(4)}\n中频峰值: ${wm.midFreqPeaks}\nLSB偏移: ${wm.lsbBias.toFixed(4)}`,
            wm.suspicious ? 'weak' : null,
        ));
    }

    return {
        detections,
        meta,
        jumbf: {
            ...jumbf,
            digitalSourceType: c2pa.digitalSourceType || jumbf.digitalSourceType,
            verification: c2pa,
        },
    };
}
