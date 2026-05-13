// i18n: zh/en dictionary + runtime switcher.
// Dynamic content (detection cards, frequency rules, log lines) calls t(key)
// at render time. Static text uses data-i18n[-attr] in HTML.

const STRINGS = {
    // Hero / empty-state
    'hero.title':           { zh: '追溯一张图的来路',                                                  en: 'Trace where an image comes from' },
    'hero.sub':             { zh: '检测 C2PA 凭证、AI 生成签名、频域水印痕迹。',                       en: 'Detect C2PA credentials, AI-generated signatures, and frequency-domain watermark traces.' },
    'hero.feature.c2pa':    { zh: 'C2PA / Content Credentials',                                       en: 'C2PA / Content Credentials' },
    'hero.feature.vendors': { zh: 'OpenAI · Google SynthID · Midjourney · SD',                        en: 'OpenAI · Google SynthID · Midjourney · SD' },
    'hero.feature.freq':    { zh: '65 项频域特征 + 启发式打分',                                        en: '65 frequency features + heuristic scoring' },
    'hero.feature.clean':   { zh: '元数据清洗 / 相机 EXIF 伪装',                                       en: 'Metadata stripping & camera EXIF spoofing' },

    // Topbar
    'topbar.github':        { zh: 'GitHub',                                                            en: 'GitHub' },
    'topbar.theme':         { zh: '切换主题',                                                          en: 'Toggle theme' },
    'topbar.lang':          { zh: '切换语言',                                                          en: 'Switch language' },

    // Upload
    'upload.text.html':     { zh: '拖拽图片到此处<br>或 <strong>点击选择</strong>',                    en: 'Drag an image here<br>or <strong>click to select</strong>' },
    'upload.hint':          { zh: 'PNG · JPEG · WebP',                                                en: 'PNG · JPEG · WebP' },
    'upload.changeFile':    { zh: '换一张',                                                            en: 'Change' },

    // File meta
    'fm.type':              { zh: '类型',                                                              en: 'Type' },
    'fm.size':              { zh: '大小',                                                              en: 'Size' },
    'fm.dims':              { zh: '尺寸',                                                              en: 'Dims' },
    'fm.hash':              { zh: 'SHA-256',                                                          en: 'SHA-256' },

    // Result header
    'result.eyebrow':       { zh: '分析结果',                                                          en: 'Analysis' },
    'result.analyzing':     { zh: '正在分析',                                                          en: 'Analyzing' },
    'result.aiHit':         { zh: '发现 AI 来源凭证线索',                                              en: 'AI provenance signal found' },
    'result.aiClean':       { zh: '未发现 AI 来源凭证',                                                en: 'No AI provenance signal' },
    'result.aiHitSub':      { zh: '元数据中直接声明或强烈指向 AI 生成工具。',                          en: 'Metadata explicitly declares or strongly points to an AI generator.' },
    'result.weakSub':       { zh: '未检出元数据声明的 AI 标记;仅有字节级启发性异常,不足以判定。',     en: 'No metadata-level AI markers detected; only weak byte-level anomalies — insufficient to conclude.' },
    'result.editSub':       { zh: '未检出 AI 生成标记,但图片经过修图软件处理。',                       en: 'No AI markers detected, but the image has been touched by editing software.' },
    'result.cleanSub':      { zh: '元数据中没有发现 AI 生成相关标记。',                                en: 'No AI-related markers were found in the metadata.' },
    'badge.hit':            { zh: '命中',                                                              en: 'HIT' },
    'badge.miss':           { zh: '未命中',                                                            en: 'CLEAN' },
    'badge.found':          { zh: '发现',                                                              en: 'Found' },
    'badge.notfound':       { zh: '未发现',                                                            en: 'Not found' },
    'badge.foundEdit':      { zh: '发现修图痕迹',                                                      en: 'Edit traces' },
    'badge.foundMarker':    { zh: '发现标记',                                                          en: 'Marker found' },
    'badge.bytesC2PA':      { zh: '字节中含 C2PA 字符串',                                              en: 'C2PA string in bytes' },
    'badge.metadataAI':     { zh: '元数据命中 AI 生成工具',                                            en: 'Metadata names an AI tool' },
    'badge.metadataYes':    { zh: '存在元数据,但未命中 AI',                                           en: 'Metadata present, no AI marker' },
    'badge.metadataNone':   { zh: '无可读元数据',                                                      en: 'No readable metadata' },
    'badge.wmSuspect':      { zh: '疑似水印',                                                          en: 'Watermark suspect' },
    'badge.wmClean':        { zh: '未检测到异常',                                                      en: 'No anomaly' },
    'conf.strong':          { zh: '强证据',                                                            en: 'Strong' },
    'conf.medium':          { zh: '中等',                                                              en: 'Medium' },
    'conf.weak':            { zh: '弱',                                                                en: 'Weak' },
    'conf.info':            { zh: '提示',                                                              en: 'Note' },

    // Detection card (titles + canned descriptions)
    'det.detail.viewMore':  { zh: '查看详情',                                                          en: 'View details' },
    'det.title.c2pa':       { zh: 'C2PA / Content Credentials',                                       en: 'C2PA / Content Credentials' },
    'det.desc.c2pa.aiType': { zh: '图片嵌入了 C2PA 来源凭证,并明确声明为算法生成内容。',              en: 'Image embeds a C2PA credential explicitly declaring algorithmic generation.' },
    'det.desc.c2pa.present':{ zh: '图片嵌入了 C2PA 来源凭证。',                                        en: 'Image embeds a C2PA credential.' },
    'det.desc.c2pa.bytes':  { zh: '文件字节中出现 C2PA 相关字符串,但未发现完整 JUMBF 结构。',         en: 'C2PA-related strings present in bytes, but no full JUMBF structure.' },
    'det.desc.c2pa.none':   { zh: '没有在字节中找到 C2PA/JUMBF 线索。',                                en: 'No C2PA / JUMBF traces in the bytes.' },
    'det.title.meta':       { zh: '结构化元数据 (EXIF / XMP / IPTC)',                                  en: 'Structured metadata (EXIF / XMP / IPTC)' },
    'det.desc.meta.aiHit':  { zh: '图片元数据字段直接记录了 AI 生成工具或标记。',                       en: 'Metadata fields explicitly name an AI generator or marker.' },
    'det.desc.meta.hasAny': { zh: '提取到的元数据字段未匹配 AI 生成标记。',                            en: 'Extracted metadata fields do not match any known AI marker.' },
    'det.desc.meta.empty':  { zh: '图片几乎不含元数据(可能被剥离)。',                                en: 'Image carries almost no metadata (likely stripped).' },
    'det.title.openai':     { zh: 'OpenAI / DALL·E / GPT',                                            en: 'OpenAI / DALL·E / GPT' },
    'det.desc.openai.miss': { zh: '没有发现 OpenAI / DALL-E / ChatGPT 相关标记。',                    en: 'No OpenAI / DALL·E / ChatGPT markers found.' },
    'det.title.google':     { zh: 'Google / SynthID / Gemini',                                        en: 'Google / SynthID / Gemini' },
    'det.desc.google.miss': { zh: '没有发现 Google / SynthID / Gemini 相关标记。',                     en: 'No Google / SynthID / Gemini markers found.' },
    'det.title.midjourney': { zh: 'Midjourney',                                                        en: 'Midjourney' },
    'det.desc.midjourney.miss':{ zh: '没有发现 Midjourney 相关标记。',                                 en: 'No Midjourney markers found.' },
    'det.title.sd':         { zh: 'Stable Diffusion / ComfyUI / Flux',                                en: 'Stable Diffusion / ComfyUI / Flux' },
    'det.desc.sd.miss':     { zh: '没有发现 Stable Diffusion / ComfyUI / Flux 相关标记。',            en: 'No Stable Diffusion / ComfyUI / Flux markers found.' },
    'det.title.adobe':      { zh: 'Adobe Firefly (AI)',                                               en: 'Adobe Firefly (AI)' },
    'det.desc.adobe.miss':  { zh: '没有发现 Adobe Firefly 相关标记。',                                en: 'No Adobe Firefly markers found.' },
    'det.title.photoshop':  { zh: 'Photoshop / 修图软件 (非 AI)',                                     en: 'Photoshop / Edit software (non-AI)' },
    'det.desc.photoshop.miss':{ zh: '没有发现 Photoshop / Lightroom 处理痕迹。',                       en: 'No Photoshop / Lightroom traces found.' },
    'det.title.pngtext':    { zh: 'PNG 文本块 / 生成参数',                                            en: 'PNG text chunks / generation params' },
    'det.desc.pngtext.miss':{ zh: '没有发现 PNG 文本块中的生成参数。',                                en: 'No generation params found in PNG text chunks.' },
    'det.title.wm':         { zh: '像素级隐形水印(字节级启发)',                                      en: 'Pixel-level invisible watermark (byte heuristic)' },
    'det.desc.wm.suspect':  { zh: '字节分布偏离自然图像模型,可能存在隐形水印。完整频域分析将在"频域"tab 提供。', en: 'Byte distribution deviates from natural-image models — possible invisible watermark. Full frequency analysis is in the Frequency tab.' },
    'det.desc.wm.clean':    { zh: '字节分布符合自然图像特征,未发现明显水印痕迹。',                    en: 'Byte distribution matches natural images — no obvious watermark traces.' },
    'det.foundOne':         { zh: '发现 ${kw}',                                                       en: 'Found ${kw}' },
    'det.cardKwHits':       { zh: '发现 ${list} 等相关标记。',                                        en: 'Found ${list} and related markers.' },
    'det.cardEditHits':     { zh: '检测到 ${list} 修图痕迹。',                                        en: 'Detected ${list} editing traces.' },

    // Tabs
    'tab.detect':   { zh: '溯源',     en: 'Detect' },
    'tab.freq':     { zh: '频域',     en: 'Frequency' },
    'tab.meta':     { zh: '元数据',   en: 'Metadata' },
    'tab.convert':  { zh: '转换',     en: 'Convert' },

    // Frequency tab
    'freq.runBtn':          { zh: '运行频域分析',                                                       en: 'Run frequency analysis' },
    'freq.panelHint.html':  { zh: '提取 65 个频域特征:FFT 幅度谱、径向功率谱、相位一致性、LSB 偏置、小波子带能量……<br>在 Web Worker 中执行,不阻塞页面。耗时约 1-3 秒。', en: 'Extracts 65 frequency features: FFT magnitude, radial power spectrum, phase consistency, LSB bias, wavelet sub-bands…<br>Runs in a Web Worker so the UI stays responsive. ~1-3 s.' },
    'freq.disclaimer.tag':  { zh: '非专业分析',                                                         en: 'Not lab-grade' },
    'freq.disclaimer.text': { zh: '仅供参考 · 基于启发式规则,不等同于学术级分类器',                    en: 'Reference only · heuristic rules, not an academic classifier' },
    'freq.verdict.label':   { zh: '启发式判定',                                                         en: 'Heuristic verdict' },
    'freq.score':           { zh: '得分 ${total} · 正向证据 ${pos} · 反向 ${neg}',                     en: 'Score ${total} · pros ${pos} · cons ${neg}' },
    'freq.timing':          { zh: '分析分辨率 ${side}×${side} · 用时 ${ms}ms',                         en: 'Resolution ${side}×${side} · took ${ms}ms' },
    'freq.viz.fft':         { zh: 'FFT 幅度谱(对数)',                                                 en: 'FFT magnitude (log)' },
    'freq.viz.radial':      { zh: '径向功率谱',                                                         en: 'Radial power spectrum' },
    'freq.axis.low':        { zh: '低频',                                                               en: 'Low' },
    'freq.axis.high':       { zh: '高频',                                                               en: 'High' },
    'freq.votes.title':     { zh: '判定依据 (${n} 条触发)',                                             en: 'Rules fired (${n})' },
    'freq.votes.empty':     { zh: '没有规则被触发,特征落在正常范围内。',                                en: 'No rules fired — all features are within normal range.' },
    'freq.features.summary':{ zh: '全部特征值 (${n})',                                                  en: 'All feature values (${n})' },
    'freq.verdict.highAI':  { zh: '高度疑似 AI 生成',                                                   en: 'Highly likely AI-generated' },
    'freq.verdict.hasAI':   { zh: '存在 AI 特征',                                                       en: 'AI-like characteristics' },
    'freq.verdict.weak':    { zh: '轻微可疑',                                                           en: 'Slightly suspicious' },
    'freq.verdict.real':    { zh: '更接近真实照片',                                                     en: 'Closer to a real photo' },
    'freq.verdict.unsure':  { zh: '特征模糊,无法判定',                                                 en: 'Inconclusive features' },
    'freq.err':             { zh: '频域分析失败: ${msg}',                                               en: 'Frequency analysis failed: ${msg}' },

    // Convert tab
    'conv.sub':             { zh: '剥离 C2PA / AI 标记,重编码并注入相机 EXIF,让图片看起来像真实相机拍的。', en: 'Strip C2PA / AI markers, re-encode, and inject camera EXIF so the image looks camera-native.' },
    'conv.group.phone':     { zh: '手机',                                                               en: 'Phone' },
    'conv.group.dslr':      { zh: '无反 / 单反',                                                        en: 'Mirrorless / DSLR' },
    'conv.group.compact':   { zh: '紧凑 / 胶片感',                                                      en: 'Compact / Film-look' },
    'conv.wm.toggle':       { zh: '扰动像素级隐形水印',                                                  en: 'Disrupt pixel-level invisible watermark' },
    'conv.wm.hint':         { zh: '多种技术组合降低 SynthID / Stable Signature / dwtDct 等水印可检测性。用于学术鲁棒性评估。', en: 'Combines multiple techniques to reduce detectability of SynthID, Stable Signature, dwtDct watermarks. For academic robustness evaluation.' },
    'conv.preset':          { zh: '预设',                                                               en: 'Preset' },
    'conv.preset.light':    { zh: '轻量',                                                               en: 'Light' },
    'conv.preset.rec':      { zh: '推荐',                                                               en: 'Recommended' },
    'conv.preset.strong':   { zh: '强力',                                                               en: 'Strong' },
    'conv.preset.ultra':    { zh: '极限',                                                               en: 'Extreme' },
    'conv.preset.custom':   { zh: '自定义',                                                             en: 'Custom' },
    'conv.intensity':       { zh: '强度',                                                               en: 'Intensity' },
    'conv.tech.geom':       { zh: '几何微变换',                                                         en: 'Micro geometry' },
    'conv.tech.geom.desc':  { zh: '裁边 0.3-1.5% 后 resize,破坏几何对齐水印',                          en: 'Crop 0.3-1.5% then resize; breaks geometry-aligned watermarks' },
    'conv.tech.noise':      { zh: '高斯噪声',                                                           en: 'Gaussian noise' },
    'conv.tech.noise.desc': { zh: '±2 至 ±6 灰度值,提升噪声地板',                                      en: 'Adds ±2–±6 grayscale noise, raising the noise floor' },
    'conv.tech.unsharp':    { zh: '锐化补偿',                                                           en: 'Unsharp mask' },
    'conv.tech.unsharp.desc':{ zh: '恢复噪声/重采样造成的视觉柔化',                                      en: 'Restores perceived sharpness after noise + resampling' },
    'conv.tech.doubleJpeg': { zh: '双次 JPEG',                                                          en: 'Double JPEG' },
    'conv.tech.doubleJpeg.desc':{ zh: 'q=60-72 中间编码,破坏 DCT 域水印',                              en: 'Mid-q 60-72 re-encode; breaks DCT-domain watermarks' },
    'conv.tech.chShift':    { zh: '通道位移',                                                           en: 'Channel shift' },
    'conv.tech.chShift.desc':{ zh: 'R/B 通道 ±1 像素,破坏跨通道对齐水印',                              en: 'R/B channel shift ±1 px; breaks cross-channel watermarks' },
    'conv.tech.bandNoise':  { zh: '低频带状噪声',                                                       en: 'Low-freq band noise' },
    'conv.tech.bandNoise.desc':{ zh: '粗网格平滑噪声,扰动频域中低频',                                   en: 'Coarse-grid smooth noise; perturbs mid/low frequency band' },
    'conv.tech.fftPhase':   { zh: 'FFT 相位扰动',                                                       en: 'FFT phase perturbation' },
    'conv.tech.fftPhase.desc':{ zh: '真 2D-FFT 中频相位 ±3-5°,直击 SynthID,~500ms',                    en: 'Real 2D-FFT mid-band phase ±3-5°; targets SynthID, ~500 ms' },
    'conv.tech.median':     { zh: '中值滤波 3×3',                                                       en: 'Median filter 3×3' },
    'conv.tech.median.desc':{ zh: '破坏 LSB 隐写与单像素噪声水印',                                      en: 'Breaks LSB stego and single-pixel noise watermarks' },
    'conv.tech.badge.slow': { zh: '慢',                                                                 en: 'slow' },
    'conv.tech.badge.soft': { zh: '轻柔化',                                                             en: 'soft' },
    'conv.adv.summary':     { zh: '高级选项',                                                           en: 'Advanced options' },
    'conv.adv.note':        { zh: '默认即为推荐值,不改也行',                                           en: 'Defaults are recommended; fine to leave as-is' },
    'conv.adv.date':        { zh: '拍摄时间',                                                           en: 'Shoot time' },
    'conv.adv.date.now':    { zh: '现在 (推荐)',                                                        en: 'Now (recommended)' },
    'conv.adv.date.1h':     { zh: '1 小时前',                                                            en: '1 hour ago' },
    'conv.adv.date.1d':     { zh: '1 天前',                                                              en: '1 day ago' },
    'conv.adv.date.7d':     { zh: '1 周前',                                                              en: '1 week ago' },
    'conv.adv.date.30d':    { zh: '1 个月前',                                                            en: '1 month ago' },
    'conv.adv.date.365d':   { zh: '1 年前',                                                              en: '1 year ago' },
    'conv.adv.date.custom': { zh: '自定义…',                                                             en: 'Custom…' },
    'conv.adv.gps':         { zh: '地理位置',                                                           en: 'GPS' },
    'conv.adv.orient':      { zh: '方向',                                                               en: 'Orientation' },
    'conv.adv.orient.1':    { zh: '1 · 正常',                                                           en: '1 · Normal' },
    'conv.adv.orient.6':    { zh: '6 · 顺时针 90°',                                                     en: '6 · Rotate 90° CW' },
    'conv.adv.orient.8':    { zh: '8 · 逆时针 90°',                                                     en: '8 · Rotate 90° CCW' },
    'conv.adv.orient.3':    { zh: '3 · 180°',                                                           en: '3 · 180°' },
    'conv.adv.quality':     { zh: 'JPEG 质量',                                                           en: 'JPEG quality' },
    'conv.adv.quality.rand':{ zh: '随机 88-95 (推荐)',                                                   en: 'Random 88-95 (recommended)' },
    'conv.adv.quality.custom':{ zh: '自定义…',                                                           en: 'Custom…' },
    'conv.adv.iso':         { zh: 'ISO',                                                                 en: 'ISO' },
    'conv.adv.iso.ph':      { zh: '按相机默认',                                                           en: 'Camera default' },
    'conv.adv.fnum':        { zh: '光圈 f/',                                                             en: 'Aperture f/' },
    'conv.adv.shutter':     { zh: '快门 1/…',                                                             en: 'Shutter 1/…' },
    'conv.runBtn':          { zh: '开始转换',                                                           en: 'Convert' },
    'conv.reanalyze':       { zh: '重新分析',                                                           en: 'Re-analyze' },
    'conv.download':        { zh: '下载 (${size})',                                                     en: 'Download (${size})' },
    'conv.processing':      { zh: '正在处理...',                                                         en: 'Processing...' },
    'conv.done':            { zh: '转换完成',                                                           en: 'Conversion complete' },
    'conv.err':             { zh: '转换失败: ${msg}',                                                   en: 'Conversion failed: ${msg}' },

    // GPS presets
    'gps.none':             { zh: '不写入 GPS (推荐)',                                                   en: 'No GPS (recommended)' },
    'gps.beijing':          { zh: '北京 · 故宫午门',                                                     en: 'Beijing · Forbidden City' },
    'gps.shanghai':         { zh: '上海 · 外滩',                                                         en: 'Shanghai · The Bund' },
    'gps.gz':               { zh: '广州 · 小蛮腰',                                                       en: 'Guangzhou · Canton Tower' },
    'gps.shenzhen':         { zh: '深圳 · 平安金融中心',                                                 en: 'Shenzhen · Ping An Finance Centre' },
    'gps.chengdu':          { zh: '成都 · 春熙路',                                                       en: 'Chengdu · Chunxi Road' },
    'gps.hongkong':         { zh: '香港 · 维多利亚港',                                                   en: 'Hong Kong · Victoria Harbour' },
    'gps.tokyo':            { zh: '东京 · 涩谷站',                                                       en: 'Tokyo · Shibuya Stn' },
    'gps.nyc':              { zh: '纽约 · 时代广场',                                                     en: 'New York · Times Square' },

    // Analysis log (progressive)
    'log.readBytes':        { zh: '读取文件字节',                                                       en: 'Read file bytes' },
    'log.sha256':           { zh: '计算 SHA-256 指纹',                                                  en: 'Compute SHA-256' },
    'log.jumbf':            { zh: '扫描 JUMBF / C2PA 签名容器',                                         en: 'Scan JUMBF / C2PA containers' },
    'log.exif':             { zh: '解析 EXIF / XMP / IPTC / ICC',                                       en: 'Parse EXIF / XMP / IPTC / ICC' },
    'log.markers':          { zh: '匹配 AI 生成标记库',                                                 en: 'Match AI marker library' },
    'log.wmHeuristic':      { zh: '字节级水印启发分析',                                                 en: 'Byte-level watermark heuristics' },
    'log.hits':             { zh: '命中 ${n} 项',                                                        en: '${n} hits' },
    'log.allNeg':           { zh: '全部阴性',                                                           en: 'all negative' },
    'log.jumbfHit':         { zh: '发现 ${n} 个 JUMBF box',                                              en: 'Found ${n} JUMBF boxes' },
    'log.jumbfNone':        { zh: '未发现',                                                             en: 'None found' },
    'log.fieldsCount':      { zh: '读取到 ${n} 个字段',                                                  en: '${n} fields parsed' },
    'log.noMeta':           { zh: '无元数据',                                                           en: 'No metadata' },
    'log.err':              { zh: '分析失败:${msg}',                                                   en: 'Analysis failed: ${msg}' },

    // Stats bar
    'stats.visits':         { zh: '访问',                                                               en: 'Visits' },
    'stats.analyses':       { zh: '检测',                                                               en: 'Analyses' },
    'stats.conversions':    { zh: '转换',                                                               en: 'Conversions' },

    // Community card
    'comm.eyebrow':         { zh: '社群',                                                               en: 'Community' },
    'comm.title':           { zh: 'AI 电商微信交流群',                                                  en: 'AI E-commerce WeChat Group' },
    'comm.sub':             { zh: '扫码加入讨论 · AI 图片工具 / 电商素材 / 自动化 / 工具链分享',         en: 'Scan to join · AI image tools / e-commerce assets / automation / toolchain sharing' },
    'comm.hint.html':       { zh: '点二维码查看原图,或在 <a href="https://github.com/863401402/image-provenance/issues" target="_blank" rel="noopener">GitHub Issues</a> 提醒更新', en: 'Tap the QR to open the full image, or ping on <a href="https://github.com/863401402/image-provenance/issues" target="_blank" rel="noopener">GitHub Issues</a> if it expired' },

    // Footer
    'foot.mit':             { zh: 'MIT · 开源于 <a href="https://github.com/863401402/image-provenance" target="_blank" rel="noopener">GitHub</a>', en: 'MIT · Open source on <a href="https://github.com/863401402/image-provenance" target="_blank" rel="noopener">GitHub</a>' },
    'foot.pitch':           { zh: '零构建 · 零后端 · 零上传',                                           en: 'Zero build · Zero backend · Zero upload' },

    // SEO meta (rendered into document.title / meta[name=description]... on language change)
    'seo.title':            { zh: 'AI 图片检测 · C2PA / SynthID / Sora / Gemini / Midjourney 溯源 · Image Provenance',
                              en: 'AI Image Detector · C2PA / SynthID / Sora / Gemini / Midjourney Provenance · Image Provenance' },
    'seo.description':      { zh: '免费 AI 图片检测工具。100% 在浏览器里运行,图片不上传。识别 C2PA / Content Credentials 来源凭证、Google SynthID 水印、OpenAI DALL·E / Sora / gpt-image / Nano Banana、Midjourney、Stable Diffusion / SDXL / Flux、Adobe Firefly 等 AI 生成签名。提取 EXIF / XMP / IPTC / ICC 元数据,65 项频域特征启发式分析,支持去除元数据、扰动水印、注入相机 EXIF 伪装为真实照片。',
                              en: 'Free AI-image detector that runs 100% in your browser — images are never uploaded. Identifies C2PA / Content Credentials, Google SynthID, OpenAI DALL·E / Sora / gpt-image / Nano Banana, Midjourney, Stable Diffusion / SDXL / Flux, Adobe Firefly and more. Parses EXIF / XMP / IPTC / ICC, 65-feature frequency-domain heuristic analysis, metadata stripping, watermark disruption, fake camera EXIF injection.' },
    'seo.keywords':         { zh: 'AI 图片检测,AI 生成图检测,C2PA,SynthID,Sora,DALL-E,gpt-image,Nano Banana,Midjourney,Stable Diffusion,SDXL,Flux,ComfyUI,Adobe Firefly,Gemini,Imagen,EXIF 分析,频域分析,图像水印检测,水印去除,图像溯源,image forensics,AI image detector,synthetic image detection,EXIF viewer online,C2PA verifier,watermark removal,客户端工具,零后端',
                              en: 'AI image detector, AI-generated image detection, C2PA verifier, Content Credentials, SynthID detector, Sora detection, DALL-E detection, gpt-image, Nano Banana, Midjourney detector, Stable Diffusion detector, SDXL, Flux, ComfyUI, Adobe Firefly, Gemini, Imagen, EXIF viewer online, XMP parser, IPTC, JUMBF, frequency analysis, FFT image analysis, image forensics, watermark detection, watermark removal, synthetic image detection, diffusion model detection, client-side tool, no upload' },
    'seo.ogTitle':          { zh: 'AI 图片检测 · C2PA / SynthID / Sora / Midjourney / DALL-E 溯源 · 浏览器运行不上传',
                              en: 'AI Image Detector · C2PA / SynthID / Sora / Midjourney / DALL-E · Runs in your browser, no upload' },
    'seo.ogDescription':    { zh: '免费 AI 图片检测工具。识别 C2PA、Google SynthID、OpenAI DALL-E / Sora / gpt-image、Midjourney、Stable Diffusion、Flux、Adobe Firefly、Gemini 等 AI 生成签名;读取 EXIF / XMP 元数据;65 项频域特征分析。100% 客户端,图片不上传。',
                              en: 'Free AI-image detector. Recognizes C2PA, Google SynthID, OpenAI DALL-E / Sora / gpt-image, Midjourney, Stable Diffusion, Flux, Adobe Firefly, Gemini signatures. Parses EXIF / XMP. 65-feature frequency analysis. 100% client-side, no upload.' },
    'seo.twDescription':    { zh: '浏览器内运行的免费 AI 图片溯源 · C2PA / EXIF / 65 频域特征 · 零后端图片不上传',
                              en: 'Free in-browser AI image provenance · C2PA / EXIF / 65 frequency features · Zero backend, no upload' },
};

let _lang = null;

function detectLang() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('lang');
    if (fromUrl === 'en' || fromUrl === 'zh') return fromUrl;
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'zh') return saved;
    return /^zh\b/i.test(navigator.language || '') ? 'zh' : 'en';
}

export function getLang() { return _lang ||= detectLang(); }

// Async IP geo refinement. Runs on first visit after the initial synchronous
// language pick. If the user is in a Chinese-speaking region (CN / HK / TW / SG
// / MO) but the browser is set to English, we flip to Chinese — otherwise we
// leave it alone. Stores the resolved language in localStorage so we don't
// re-probe on reloads. Fails silently if the geo API is unreachable.
const CN_REGIONS = new Set(['CN', 'HK', 'TW', 'SG', 'MO']);

export async function refineLangByIP() {
    // Skip if user already picked manually, or a URL param is forcing a choice
    if (localStorage.getItem('lang')) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('lang')) return;
    try {
        const r = await fetch('https://ipapi.co/country/', { cache: 'force-cache' });
        if (!r.ok) return;
        const code = (await r.text()).trim().toUpperCase();
        const wantZh = CN_REGIONS.has(code);
        const current = getLang();
        if (wantZh && current !== 'zh') setLang('zh');
        else if (!wantZh && current !== 'en') setLang('en');
        // persist the resolved choice so we don't re-probe next reload
        localStorage.setItem('lang', getLang());
    } catch { /* network/geo failure — stick with detected lang */ }
}

export function t(key, vars) {
    const lang = getLang();
    const entry = STRINGS[key];
    if (!entry) return key;
    let s = entry[lang] ?? entry.zh ?? key;
    if (vars) for (const k in vars) s = s.replace('${' + k + '}', vars[k]);
    return s;
}

export function setLang(lang) {
    if (lang !== 'en' && lang !== 'zh') return;
    _lang = lang;
    localStorage.setItem('lang', lang);
    // sync URL (?lang=en for English; remove param for Chinese default)
    const url = new URL(window.location.href);
    if (lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    history.replaceState(null, '', url.toString());
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applyI18n();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function applyI18n() {
    const lang = getLang();
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.dataset.i18n;
        const txt = t(k);
        if (el.dataset.i18nHtml === '' || k.endsWith('.html')) el.innerHTML = txt;
        else el.textContent = txt;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        // Format: "attrName:key,attrName:key"
        for (const pair of el.dataset.i18nAttr.split(',')) {
            const [attr, k] = pair.split(':');
            el.setAttribute(attr, t(k));
        }
    });
    // Sync title + meta description for SEO
    const title = t('seo.title');
    if (title && title !== 'seo.title') document.title = title;
    const setMeta = (sel, key) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const v = t(key);
        if (v && v !== key) el.setAttribute('content', v);
    };
    setMeta('meta[name="description"]',  'seo.description');
    setMeta('meta[name="keywords"]',     'seo.keywords');
    setMeta('meta[property="og:title"]', 'seo.ogTitle');
    setMeta('meta[property="og:description"]', 'seo.ogDescription');
    setMeta('meta[name="twitter:title"]',       'seo.ogTitle');
    setMeta('meta[name="twitter:description"]', 'seo.twDescription');
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', lang === 'zh' ? 'zh_CN' : 'en_US');
}

export { STRINGS };
