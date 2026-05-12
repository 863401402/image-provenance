// Byte-level keyword detection for AI provenance markers
// Ported from index.html runAllDetections() + helpers.

import { bytesToString } from './utils.js';
import { detectWatermarkFFT } from './watermark-detect.js';

function findWithContext(str, keywords) {
    const results = [];
    const seen = new Set();
    for (const kw of keywords) {
        if (seen.has(kw.toLowerCase())) continue;
        const idx = str.indexOf(kw);
        if (idx !== -1) {
            seen.add(kw.toLowerCase());
            const start = Math.max(0, idx - 30);
            const end = Math.min(str.length, idx + kw.length + 30);
            const context = str.substring(start, end).replace(/[\x00-\x08\x0e-\x1f]/g, '.');
            results.push({ keyword: kw, context });
        }
    }
    return results;
}

function mk(title, found, hitDesc, missDesc) {
    const hit = found.length > 0;
    return {
        title,
        hit,
        badgeText: hit ? hitDesc.badge : missDesc.badge,
        badgeClass: hit ? 'badge-hit' : 'badge-clean',
        desc: hit ? hitDesc.desc(found) : missDesc.desc,
        detail: hit ? found.map(f => `[${f.keyword}] ...${f.context}...`).join('\n') : null,
    };
}

export function runAllDetections(uint8) {
    const str = bytesToString(uint8);
    const detections = [];

    // 1. C2PA
    detections.push(mk(
        'C2PA / Content Credentials',
        findWithContext(str, ['C2PA', 'JUMBF', 'caBX', 'c2pa.manifest', 'contentcredentials', 'urn:uuid:', 'jumbf', 'activeManifest', 'claim.v2', 'c2pa_rs', 'c2pa.hash']),
        { badge: '发现来源凭证线索', desc: f => `文件中出现 ${f.map(x=>x.keyword).join('、')} 等结构/字符串。` },
        { badge: '未发现明显线索', desc: '没有在当前文件字节中找到典型 C2PA/JUMBF 线索。' },
    ));

    // 2. OpenAI / DALL·E / GPT
    detections.push(mk(
        'OpenAI / DALL·E / GPT',
        findWithContext(str, ['OpenAI', 'openai', 'OPENAI', 'DALL-E', 'dall-e', 'DALLE', 'dalle', 'gpt-image', 'GPT-image', 'chatgpt', 'ChatGPT', 'openai.com']),
        { badge: '发现 OpenAI 线索', desc: f => `发现 ${f.map(x=>x.keyword).join('、')} 相关标记,可能由 OpenAI 工具生成。` },
        { badge: '未发现', desc: '没有发现 OpenAI/DALL-E/ChatGPT 相关标记。' },
    ));

    // 3. Google / SynthID / Gemini
    detections.push(mk(
        'Google / SynthID / Gemini',
        findWithContext(str, ['Google', 'SynthID', 'Gemini', 'Imagen', 'Nano Banana', 'nanobanana', 'DeepMind', 'GOOGLE', 'google.com', 'gemini']),
        { badge: '发现 Google 线索', desc: f => `发现 ${f.map(x=>x.keyword).join('、')} 相关标记,可能由 Google AI 工具生成。` },
        { badge: '未发现', desc: '没有发现 Google/SynthID/Gemini 相关标记。' },
    ));

    // 4. Midjourney
    detections.push(mk(
        'Midjourney',
        findWithContext(str, ['Midjourney', 'midjourney', 'MIDJOURNEY', 'mj-api', 'midj']),
        { badge: '发现 Midjourney 线索', desc: () => '发现 Midjourney 相关标记。' },
        { badge: '未发现', desc: '没有发现 Midjourney 相关标记。' },
    ));

    // 5. Stable Diffusion / ComfyUI / Flux
    detections.push(mk(
        'Stable Diffusion / ComfyUI / Flux',
        findWithContext(str, ['StableDiffusion', 'stable-diffusion', 'ComfyUI', 'comfyui', 'Flux', 'FLUX', 'Automatic1111', 'A1111', 'InvokeAI', 'Fooocus', 'stable_diffusion', 'diffusion_model']),
        { badge: '发现 SD/Flux 线索', desc: f => `发现 ${f.map(x=>x.keyword).join('、')} 相关标记。` },
        { badge: '未发现', desc: '没有发现 Stable Diffusion / ComfyUI / Flux 相关标记。' },
    ));

    // 6. Adobe Firefly / Photoshop
    detections.push(mk(
        'Adobe / Firefly / Photoshop',
        findWithContext(str, ['Adobe', 'Firefly', 'adobe_firefly', 'AdobeFirefly', 'photoshop', 'Photoshop']),
        { badge: '发现 Adobe 线索', desc: f => `发现 ${f.map(x=>x.keyword).join('、')} 相关标记。` },
        { badge: '未发现', desc: '没有发现 Adobe 相关标记。' },
    ));

    // 7. XMP / EXIF containers
    const xmpFound = findWithContext(str, ['<x:', 'xpacket', '<rdf:', 'xmlns:', 'photoshop:', 'exif:', 'tiff:', 'dc:', 'XMP', 'Exif', 'IPTC', 'ICC_Profile', 'ICC_PROFILE']);
    detections.push({
        title: 'XMP / EXIF 元数据',
        hit: xmpFound.length >= 2,
        badgeText: xmpFound.length >= 2 ? '发现元数据' : '未发现明显元数据块',
        badgeClass: xmpFound.length >= 2 ? 'badge-hit' : 'badge-clean',
        desc: xmpFound.length >= 2
            ? `发现 ${xmpFound.map(f=>f.keyword).join('、')} 等元数据标记。`
            : '没有发现常见 XMP/EXIF 容器。',
        detail: xmpFound.length > 0 ? xmpFound.map(f => `[${f.keyword}] ...${f.context}...`).join('\n') : null,
    });

    // 8. PNG text chunks / generation params
    const pngFound = findWithContext(str, ['tEXt', 'iTXt', 'zTXt', 'parameters', 'prompt', 'negative_prompt', 'Steps:', 'Sampler:', 'CFG scale', 'Seed:', 'ComfyUI', 'workflow']);
    detections.push({
        title: 'PNG 文本块 / 生成参数',
        hit: pngFound.length >= 2,
        badgeText: pngFound.length >= 2 ? '发现生成参数' : '未发现',
        badgeClass: pngFound.length >= 2 ? 'badge-hit' : 'badge-clean',
        desc: pngFound.length >= 2
            ? `发现 ${pngFound.map(f=>f.keyword).join('、')} 等生成参数标记。`
            : '没有发现 PNG 文本块中的生成参数。',
        detail: pngFound.length > 0 ? pngFound.map(f => `[${f.keyword}] ...${f.context}...`).join('\n') : null,
    });

    // 9. Pixel-level invisible watermark (LSB / byte-freq heuristic)
    const wm = detectWatermarkFFT(uint8);
    detections.push({
        title: '像素级隐形水印(字节级启发)',
        hit: wm.suspicious,
        badgeText: wm.suspicious ? `疑似水印 (异常度 ${wm.score}%)` : '未检测到异常',
        badgeClass: wm.suspicious ? 'badge-hit' : 'badge-clean',
        desc: wm.suspicious
            ? '字节分布偏离自然图像模型,可能存在隐形水印。完整频域分析请看"频域"tab。'
            : '字节分布符合自然图像特征,未发现明显水印痕迹。',
        detail: `异常度: ${wm.score}%\n高频比: ${wm.highFreqRatio.toFixed(4)}\n中频峰值: ${wm.midFreqPeaks}\nLSB偏移: ${wm.lsbBias.toFixed(4)}`,
    });

    return detections;
}
