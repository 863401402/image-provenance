// Provenance marker signatures. Split from detect.js so the rules are
// reviewable without wading through scoring logic.

export const MARKERS = [
    {
        id: 'c2pa',
        title: 'C2PA / Content Credentials',
        keywords: ['C2PA', 'JUMBF', 'caBX', 'c2pa.manifest', 'contentcredentials',
                   'urn:uuid:', 'jumbf', 'activeManifest', 'claim.v2', 'c2pa_rs', 'c2pa.hash'],
        hitDesc: found => `文件中出现 ${found.map(f=>f.keyword).join('、')} 等结构/字符串。`,
        missDesc: '没有在字节中找到 C2PA/JUMBF 线索。',
    },
    {
        id: 'openai',
        title: 'OpenAI / DALL·E / GPT',
        keywords: ['OpenAI', 'openai', 'DALL-E', 'dall-e', 'DALLE', 'dalle',
                   'gpt-image', 'GPT-image', 'chatgpt', 'ChatGPT', 'openai.com'],
        hitDesc: found => `发现 ${found.map(f=>f.keyword).join('、')} 相关标记。`,
        missDesc: '没有发现 OpenAI / DALL-E / ChatGPT 相关标记。',
    },
    {
        id: 'google',
        title: 'Google / SynthID / Gemini',
        keywords: ['Google', 'SynthID', 'Gemini', 'Imagen', 'Nano Banana',
                   'nanobanana', 'DeepMind', 'google.com', 'gemini'],
        hitDesc: found => `发现 ${found.map(f=>f.keyword).join('、')} 相关标记。`,
        missDesc: '没有发现 Google / SynthID / Gemini 相关标记。',
    },
    {
        id: 'midjourney',
        title: 'Midjourney',
        keywords: ['Midjourney', 'midjourney', 'MIDJOURNEY', 'mj-api', 'midj'],
        hitDesc: () => '发现 Midjourney 相关标记。',
        missDesc: '没有发现 Midjourney 相关标记。',
    },
    {
        id: 'sd',
        title: 'Stable Diffusion / ComfyUI / Flux',
        keywords: ['StableDiffusion', 'stable-diffusion', 'ComfyUI', 'comfyui',
                   'Flux', 'FLUX', 'Automatic1111', 'A1111', 'InvokeAI', 'Fooocus',
                   'stable_diffusion', 'diffusion_model'],
        hitDesc: found => `发现 ${found.map(f=>f.keyword).join('、')} 相关标记。`,
        missDesc: '没有发现 Stable Diffusion / ComfyUI / Flux 相关标记。',
    },
    {
        id: 'adobe',
        title: 'Adobe Firefly (AI)',
        // 只匹配 Firefly 特定标记。Adobe / Photoshop 字样在正常修图、甚至
        // ICC 色彩配置文件(版权字段 "Adobe Systems Incorporated")中都会出现,
        // 不能当 AI 证据 —— 否则连微信截图都会被误判。
        keywords: ['Firefly', 'adobe_firefly', 'AdobeFirefly', 'adobefirefly'],
        hitDesc: found => `发现 ${found.map(f=>f.keyword).join('、')} (Adobe 生成式 AI)。`,
        missDesc: '没有发现 Adobe Firefly 相关标记。',
    },
    {
        id: 'photoshop',
        title: 'Photoshop / 修图软件 (非 AI)',
        category: 'edit',  // 'edit' 类别不计入 AI 命中
        // Photoshop 自身写入的元数据。注意不要用纯 "Adobe"(ICC 里就有)。
        keywords: ['Adobe Photoshop', 'photoshop:', 'Photoshop CC', 'Photoshop CS',
                   'Adobe ImageReady', 'Lightroom Classic', 'Adobe Lightroom'],
        hitThreshold: 1,
        hitDesc: found => `检测到 ${found.map(f=>f.keyword).join('、')} 修图痕迹。`,
        missDesc: '没有发现 Photoshop / Lightroom 处理痕迹。',
    },
    {
        id: 'pngtext',
        title: 'PNG 文本块 / 生成参数',
        keywords: ['tEXt', 'iTXt', 'zTXt', 'parameters', 'prompt', 'negative_prompt',
                   'Steps:', 'Sampler:', 'CFG scale', 'Seed:', 'workflow'],
        hitThreshold: 2,
        hitDesc: found => `发现 ${found.map(f=>f.keyword).join('、')} 等生成参数标记。`,
        missDesc: '没有发现 PNG 文本块中的生成参数。',
    },
];
