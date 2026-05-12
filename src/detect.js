// Provenance detection: JUMBF + structured metadata + byte-level keyword search.
// Returns a list of detection cards plus a merged metadata snapshot.

import { bytesToString } from './utils.js';
import { parseMetadata, sniffJumbf, getGenerationHints } from './metadata.js';
import { detectWatermarkFFT } from './watermark-detect.js';
import { MARKERS } from './markers.js';

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

export async function runAllDetections(uint8) {
    const str = bytesToString(uint8);
    const [meta, jumbf] = await Promise.all([parseMetadata(uint8), Promise.resolve(sniffJumbf(uint8))]);
    const detections = [];

    // --- 1. C2PA (structured: JUMBF box + DigitalSourceType) ---
    {
        const m = MARKERS.find(x => x.id === 'c2pa');
        const found = findWithContext(str, m.keywords);
        const hit = jumbf.present || found.length > 0;
        const aiType = jumbf.digitalSourceType && ['trainedAlgorithmicMedia',
            'compositeWithTrainedAlgorithmicMedia', 'algorithmicMedia', 'dataDrivenMedia']
            .includes(jumbf.digitalSourceType);
        let badgeText, desc, confidence;
        if (aiType) {
            badgeText = `C2PA 声明为 AI 生成 (${jumbf.digitalSourceType})`;
            desc = '图片嵌入了 C2PA 来源凭证,并明确声明为算法生成内容。';
            confidence = 'strong';
        } else if (jumbf.present) {
            badgeText = `C2PA 存在 (${jumbf.digitalSourceType || '来源未声明'})`;
            desc = '图片嵌入了 C2PA 来源凭证。' + (jumbf.labels.length ? ` Labels: ${jumbf.labels.join(', ')}` : '');
            confidence = 'strong';
        } else if (found.length > 0) {
            badgeText = '字节中含 C2PA 字符串';
            desc = '文件字节中出现 C2PA 相关字符串,但未发现完整 JUMBF 结构。';
            confidence = 'weak';
        } else {
            badgeText = '未发现';
            desc = m.missDesc;
        }
        const details = [];
        if (jumbf.present) details.push(`JUMBF boxes: ${jumbf.indices.length}  |  labels: ${jumbf.labels.join(', ') || '-'}  |  DigitalSourceType: ${jumbf.digitalSourceType || '-'}`);
        if (found.length) details.push(detailOf(found));
        detections.push(card(m.title, hit, badgeText, desc, details.join('\n\n') || null, confidence));
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

    return { detections, meta, jumbf };
}
