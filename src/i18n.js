// i18n: zh/en dictionary + runtime switcher.
// Dynamic content (detection cards, frequency rules, log lines) calls t(key)
// at render time. Static text uses data-i18n[-attr] in HTML.

const STRINGS = {
    'meta.evidence.verifiedAi.title': { zh: '凭证声明使用了生成式 AI', en: 'Credentials declare generative AI' },
    'meta.evidence.verifiedAi.sub': { zh: 'C2PA 签名与资源完整性验证通过，清单明确记录生成式 AI 来源；签名者信任另列。', en: 'C2PA signature and asset integrity are valid, with an explicit generative AI source type. Signer trust is shown separately.' },
    'meta.evidence.declaredAi.title': { zh: 'AIGC 元数据声明生成合成', en: 'AIGC metadata declares generation' },
    'meta.evidence.declaredAi.sub': { zh: 'Label 1 为可编辑的元数据声明，未验证生成服务商身份或签名。', en: 'Label 1 is editable metadata; provider identity and signatures are not verified.' },
    'meta.evidence.toolAi.title': { zh: '元数据记录了 AI 来源线索', en: 'Metadata records AI source clues' },
    'meta.evidence.toolAi.sub': { zh: '使用与主检测页相同的工具字段和来源类型规则；字段可编辑，不是签名验证。', en: 'Uses the same generator-field and source-type rules as the detection tab. Fields are editable, not signature verification.' },
    'meta.evidence.uncertain.title': { zh: '元数据线索不足以确认', en: 'Metadata evidence is inconclusive' },
    'meta.evidence.uncertain.sub': { zh: '可能、疑似、冲突或不完整的 AIGC 标识仅作弱线索，不能确认 AI 来源。', en: 'Possible, suspected, conflicting or incomplete AIGC declarations are weak clues and do not confirm AI origin.' },
    'meta.evidence.invalid.title': { zh: '来源凭证验证失败', en: 'Credential validation failed' },
    'meta.evidence.invalid.sub': { zh: 'C2PA 完整性验证未通过；这本身不能证明图片由 AI 生成。', en: 'C2PA integrity validation failed; this alone does not establish AI generation.' },
    'meta.evidence.verifiedSource.title': { zh: '来源凭证完整性已验证', en: 'Credential integrity verified' },
    'meta.evidence.verifiedSource.sub': { zh: '签名与资源哈希验证通过，但清单未声明生成式 AI 来源；不代表图片未经编辑，签名者信任另列。', en: 'Signature and asset hashes are valid, without a declared generative AI source type. This does not establish an unedited image; signer trust is shown separately.' },
    'meta.evidence.unreadable.title': { zh: '部分元数据无法读取', en: 'Some metadata could not be read' },
    'meta.evidence.unreadable.sub': { zh: '解析失败或字段不完整；不能把无法读取当作不存在，也不能据此判断拍摄来源。', en: 'Parsing failed or fields are incomplete. Unreadable data is not absence and does not establish capture origin.' },
    'meta.evidence.camera.title': { zh: '存在相机元数据字段', en: 'Camera metadata fields are present' },
    'meta.evidence.camera.sub': { zh: '品牌、型号、拍摄参数和厂商字段都可能被编辑或复制，不能仅凭 EXIF 证明真实拍摄。', en: 'Camera, exposure and manufacturer fields can be edited or copied. EXIF alone does not prove real-world capture.' },
    'meta.evidence.present.title': { zh: '存在可读取元数据', en: 'Readable metadata is present' },
    'meta.evidence.present.sub': { zh: '未发现元数据明确声明的 AI 来源。缺少声明不能证明图片来自相机。', en: 'No explicit AI origin declaration was found in metadata. Missing declarations do not prove camera origin.' },
    'meta.evidence.unverified.title': { zh: '发现未验证的来源结构', en: 'Unverified provenance structure found' },
    'meta.evidence.unverified.sub': { zh: '检测到来源凭证结构，但未完成验证，不能确认来源或真实性。', en: 'Credential structure is present, but validation is incomplete; origin and authenticity remain unconfirmed.' },
    'meta.evidence.none.title': { zh: '未发现可用元数据', en: 'No usable metadata found' },
    'meta.evidence.none.sub': { zh: '截图、转存或重编码可能移除元数据；缺失元数据不说明图片是否由 AI 生成。', en: 'Screenshots, saving and re-encoding may remove metadata; missing metadata does not determine AI origin.' },
    'meta.brand': { zh: '品牌', en: 'Make' },
    'meta.model': { zh: '型号', en: 'Model' },
    'meta.software': { zh: '软件', en: 'Software' },
    'meta.lens': { zh: '镜头', en: 'Lens' },
    'meta.lensMake': { zh: '镜头厂', en: 'Lens make' },
    'meta.lensSerial': { zh: '镜头序列号', en: 'Lens serial number' },
    'meta.bodySerial': { zh: '机身序列号', en: 'Body serial number' },
    'meta.owner': { zh: '所有者', en: 'Owner' },
    'meta.aperture': { zh: '光圈', en: 'Aperture' },
    'meta.shutter': { zh: '快门', en: 'Shutter' },
    'meta.focal': { zh: '焦距', en: 'Focal length' },
    'meta.focal35': { zh: '等效焦距', en: '35 mm equivalent' },
    'meta.exposure': { zh: '曝光补偿', en: 'Exposure compensation' },
    'meta.program': { zh: '曝光程序', en: 'Exposure program' },
    'meta.metering': { zh: '测光模式', en: 'Metering mode' },
    'meta.whiteBalance': { zh: '白平衡', en: 'White balance' },
    'meta.flash': { zh: '闪光灯', en: 'Flash' },
    'meta.flashOff': { zh: '未闪光', en: 'Did not fire' },
    'meta.flashOn': { zh: '已闪光', en: 'Fired' },
    'meta.taken': { zh: '拍摄时间', en: 'Capture time' },
    'meta.digitized': { zh: '数字化时间', en: 'Digitized time' },
    'meta.modified': { zh: '最后修改', en: 'Last modified' },
    'meta.coordinates': { zh: '经纬度', en: 'Coordinates' },
    'meta.altitude': { zh: '海拔', en: 'Altitude' },
    'meta.direction': { zh: '方向', en: 'Direction' },
    'meta.gpsTime': { zh: '时间戳 (UTC)', en: 'Timestamp (UTC)' },
    'meta.dimensions': { zh: '尺寸', en: 'Dimensions' },
    'meta.colorSpace': { zh: '色彩空间', en: 'Color space' },
    'meta.icc': { zh: 'ICC 配置', en: 'ICC profile' },
    'meta.resolution': { zh: '分辨率', en: 'Resolution' },
    'meta.cameraSection': { zh: '相机与镜头', en: 'Camera and lens' },
    'meta.captureSection': { zh: '拍摄参数', en: 'Capture settings' },
    'meta.timeSection': { zh: '时间', en: 'Time' },
    'meta.gpsSection': { zh: '地理位置', en: 'Location' },
    'meta.imageSection': { zh: '图像属性', en: 'Image properties' },
    'meta.history': { zh: '编辑历史', en: 'Editing history' },
    'meta.gpsWarning': { zh: '⚠️ 图片包含精确 GPS 坐标，分享前请留意位置隐私。', en: '⚠️ This image contains precise GPS coordinates. Consider location privacy before sharing.' },
    'meta.map': { zh: '在 OpenStreetMap 查看', en: 'View on OpenStreetMap' },
    'meta.raw': { zh: '全部原始字段', en: 'All raw fields' },
    'meta.integrity': { zh: '签名与资源完整性', en: 'Signature and asset integrity' },
    'meta.signerTrust': { zh: '签名者信任', en: 'Signer trust' },
    'meta.valid': { zh: '验证通过', en: 'Valid' },
    'meta.invalid': { zh: '验证失败', en: 'Invalid' },
    'meta.unverified': { zh: '未验证', en: 'Not verified' },
    'meta.trusted': { zh: '受信任', en: 'Trusted' },
    'meta.trustUnconfirmed': { zh: '信任未确认', en: 'Trust not confirmed' },
    'meta.sourceType': { zh: '来源类型', en: 'Source type' },
    'meta.claimGenerator': { zh: '凭证生成器', en: 'Claim generator' },
    'meta.failures': { zh: '验证失败项', en: 'Validation failures' },
    'meta.notDeclared': { zh: '未声明', en: 'Not declared' },
    'meta.declaration': { zh: '标识声明', en: 'Declaration' },
    'meta.empty': { zh: '没有可读取的元数据。元数据可能已被移除，这不能证明或排除 AI 生成。', en: 'No readable metadata. Metadata may have been removed; this does not prove or rule out AI generation.' },
    'det.aigc.title': { zh: '国内 AIGC 标识（GB / TC260）', en: 'China AIGC declaration (GB / TC260)' },
    'det.aigc.field.Label': { zh: '生成标签', en: 'Generation label' },
    'det.aigc.field.ContentProducer': { zh: '生成服务商（自声明）', en: 'Producer (self-declared)' },
    'det.aigc.field.ProduceID': { zh: '制作编号', en: 'Production ID' },
    'det.aigc.field.ReservedCode1': { zh: '生成侧预留字段', en: 'Producer reserved field' },
    'det.aigc.field.ContentPropagator': { zh: '传播服务商（自声明）', en: 'Propagator (self-declared)' },
    'det.aigc.field.PropagateID': { zh: '传播编号', en: 'Propagation ID' },
    'det.aigc.field.ReservedCode2': { zh: '传播侧预留字段', en: 'Propagator reserved field' },
    'det.aigc.field.location': { zh: '存储位置', en: 'Storage location' },
    'det.aigc.field.issues': { zh: '解析问题', en: 'Parsing issues' },
    'det.aigc.generated': { zh: '元数据声明：AI 生成合成', en: 'Declared AI-generated / synthetic' },
    'det.aigc.possible': { zh: '元数据声明：可能为 AI', en: 'Declared possibly AI-generated' },
    'det.aigc.suspected': { zh: '元数据声明：疑似为 AI', en: 'Declared suspected AI-generated' },
    'det.aigc.conflict': { zh: '多份标识存在冲突', en: 'Conflicting declarations' },
    'det.aigc.unreadable': { zh: '标识或容器无法完整解析', en: 'Declaration or container could not be fully read' },
    'det.aigc.absent': { zh: '未发现可读取标识', en: 'No readable declaration found' },
    'det.aigc.description': { zh: '读取图片元数据中的生成标签、生成与传播服务商及编号。字段可编辑，未验证签名或服务商身份；“可能／疑似”与冲突仅作弱线索。未发现不代表非 AI。', en: 'Reads labels, producer and propagator identifiers from image metadata. Fields are editable; signatures and provider identity are not verified. Possible, suspected and conflicting declarations remain weak clues. Absence does not rule out AI.' },
    'det.watermark.statistics': { zh: '仅供统计参考', en: 'Statistics only' },
    'badge.markerFound': { zh: '发现标记', en: 'Marker found' },
    'det.title.bytedance': { zh: 'ByteDance / 豆包 / Seedream / 即梦', en: 'ByteDance / Doubao / Seedream / Jimeng' },
    'det.desc.bytedance.miss': { zh: '未发现豆包 / Seedream / 即梦标记；不能排除这些工具生成的图片。', en: 'No Doubao / Seedream / Jimeng markers found; this does not rule out these generators.' },
    'det.title.qwen': { zh: 'Qwen-Image / HunyuanImage', en: 'Qwen-Image / HunyuanImage' },
    'det.desc.qwen.miss': { zh: '未发现 Qwen-Image / HunyuanImage 标记。', en: 'No Qwen-Image / HunyuanImage markers found.' },
    'det.watermark.insufficient': { zh: '样本不足', en: 'Insufficient samples' },
    'det.watermark.insufficientDesc': { zh: '文件过小，无法进行字节统计；这不代表不存在水印。', en: 'The file is too small for byte statistics; this does not rule out a watermark.' },
    // Hero / empty-state
    'hero.title':           { zh: '追溯一张图的来路',                                                  en: 'Trace where an image comes from' },
    'hero.sub':             { zh: '验证 C2PA 凭证、检查生成工具元数据与频域异常。', en: 'Verify C2PA credentials, inspect generator metadata and frequency anomalies.' },
    'hero.feature.c2pa':    { zh: 'C2PA / Content Credentials',                                       en: 'C2PA / Content Credentials' },
    'hero.feature.vendors': { zh: 'OpenAI · Gemini · Seedream · Qwen-Image', en: 'OpenAI · Gemini · Seedream · Qwen-Image' },
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

    // App mode / batch processing
    'mode.single':          { zh: '单张',                                                              en: 'Single' },
    'mode.batch':           { zh: '批量',                                                              en: 'Batch' },
    'batch.eyebrow':        { zh: '批量任务',                                                          en: 'Batch jobs' },
    'batch.title':          { zh: '本地批量处理',                                                      en: 'Local batch processing' },
    'batch.operation.detect':{ zh: '检测',                                                             en: 'Detect' },
    'batch.operation.convert':{ zh: '转换',                                                            en: 'Convert' },
    'batch.mode.quick':     { zh: '快速',                                                              en: 'Quick' },
    'batch.mode.full':      { zh: '完整',                                                              en: 'Full' },
    'batch.add':            { zh: '添加图片',                                                          en: 'Add images' },
    'batch.camera':         { zh: '相机配置',                                                          en: 'Camera profile' },
    'batch.quality':        { zh: 'JPEG 质量',                                                         en: 'JPEG quality' },
    'batch.quality.random': { zh: '随机 88-95',                                                        en: 'Random 88-95' },
    'batch.advanced':       { zh: '高级 EXIF',                                                         en: 'Advanced EXIF' },
    'batch.cancel':         { zh: '取消',                                                              en: 'Cancel' },
    'batch.clear':          { zh: '清除已结束',                                                        en: 'Clear finished' },
    'batch.zip':            { zh: '下载 ZIP',                                                         en: 'Download ZIP' },
    'batch.empty':          { zh: '暂无任务',                                                          en: 'No jobs' },
    'batch.col.file':       { zh: '文件',                                                              en: 'File' },
    'batch.col.task':       { zh: '任务',                                                              en: 'Job' },
    'batch.col.status':     { zh: '状态',                                                              en: 'Status' },
    'batch.col.result':     { zh: '结果',                                                              en: 'Result' },
    'batch.col.action':     { zh: '操作',                                                              en: 'Actions' },
    'batch.summary':        { zh: '${done} / ${total} 已结束',                                        en: '${done} / ${total} finished' },
    'batch.score':          { zh: '得分 ${score}',                                                     en: 'score ${score}' },
    'batch.retry':          { zh: '重试',                                                              en: 'Retry' },
    'batch.download':       { zh: '下载',                                                              en: 'Download' },
    'batch.error.type':     { zh: '不支持的文件类型;仅支持 JPEG、PNG、WebP。',                         en: 'Unsupported file type; use JPEG, PNG, or WebP.' },
    'batch.error.limit':    { zh: '已达到本次任务上限 (${limit});请完成并清理后再添加。',               en: 'This queue is limited to ${limit} items; finish and clear jobs before adding more.' },
    'batch.error.zip':      { zh: 'ZIP 生成失败:${msg}',                                              en: 'ZIP creation failed: ${msg}' },
    'batch.status.queued':  { zh: '等待',                                                              en: 'Queued' },
    'batch.status.running': { zh: '处理中',                                                            en: 'Running' },
    'batch.status.completed':{ zh: '完成',                                                             en: 'Completed' },
    'batch.status.failed':  { zh: '失败',                                                              en: 'Failed' },
    'batch.status.canceled':{ zh: '已取消',                                                            en: 'Canceled' },
    'batch.stage.read':     { zh: '读取',                                                              en: 'Reading' },
    'batch.stage.identify': { zh: '识别',                                                              en: 'Identifying' },
    'batch.stage.provenance':{ zh: '验证来源',                                                         en: 'Verifying provenance' },
    'batch.stage.resize':   { zh: '缩放',                                                              en: 'Resizing' },
    'batch.stage.features': { zh: '提取特征',                                                          en: 'Extracting features' },
    'batch.stage.score':    { zh: '评分',                                                              en: 'Scoring' },
    'batch.stage.viz':      { zh: '生成图表',                                                          en: 'Rendering' },
    'batch.stage.convert':  { zh: '转换',                                                              en: 'Converting' },
    'batch.stage.watermark':{ zh: '水印处理',                                                          en: 'Processing watermark' },
    'batch.stage.complete': { zh: '完成',                                                              en: 'Complete' },
    'batch.verdict.provenance':{ zh: '发现来源凭证',                                                   en: 'Provenance found' },
    'batch.verdict.pixel':  { zh: '像素特征可疑',                                                      en: 'Pixel signal' },
    'batch.verdict.uncertain':{ zh: '无法确定',                                                        en: 'Inconclusive' },
    'batch.verdict.edit':   { zh: '发现编辑痕迹',                                                      en: 'Edit traces' },
    'batch.verdict.none':   { zh: '无明确证据',                                                        en: 'No clear evidence' },
    'batch.verdict.unsuitable':{ zh: '不适合频域判断',                                                 en: 'Not applicable' },
    'batch.verdict.pending':{ zh: '等待分析',                                                          en: 'Pending' },

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
    'result.pixelHit':      { zh: '检测到 AI 图像特征',                                                en: 'AI-like pixel features detected' },
    'result.pixelHitSub':   { zh: '来源标记可能已被平台移除;像素启发式分析仅供参考,不能作为确定结论。', en: 'Provenance markers may have been stripped; pixel heuristics are suggestive, not conclusive.' },
    'result.uncertain':     { zh: '存在可疑线索',                                                      en: 'Inconclusive signals found' },
    'result.uncertainSub':  { zh: '仅发现弱线索,不足以判断图片是否由 AI 生成。',                       en: 'Only weak signals were found, which is insufficient to determine whether the image is AI-generated.' },
    'result.pixelAnalyzing':{ zh: '未发现来源标记,正在继续分析像素特征。',                             en: 'No provenance markers found; continuing with pixel analysis.' },
    'result.unsuitable':    { zh: '不适合频域 AI 判断',                                                en: 'Not suitable for frequency AI analysis' },
    'result.unsuitableSub': { zh: '图片更接近二维码、文档、截图或低纹理图;此类内容容易误报,因此不输出 AI 得分。', en: 'This resembles a QR code, document, screenshot, or low-texture graphic; these often cause false positives, so no AI score is shown.' },
    'result.weakSub':       { zh: '未检出元数据声明的 AI 标记;仅有字节级启发性异常,不足以判定。',     en: 'No metadata-level AI markers detected; only weak byte-level anomalies — insufficient to conclude.' },
    'result.editSub':       { zh: '未检出 AI 生成标记,但图片经过修图软件处理。',                       en: 'No AI markers detected, but the image has been touched by editing software.' },
    'result.cleanSub':      { zh: '未发现明确证据;这不能证明图片一定不是 AI 生成。',                   en: 'No clear evidence was found; this does not prove the image is not AI-generated.' },
    'badge.hit':            { zh: '命中',                                                              en: 'HIT' },
    'badge.miss':           { zh: '未命中',                                                            en: 'CLEAN' },
    'badge.pixel':          { zh: '像素可疑',                                                          en: 'Pixel signal' },
    'badge.uncertain':      { zh: '无法确定',                                                          en: 'Inconclusive' },
    'badge.noEvidence':     { zh: '无明确证据',                                                        en: 'No clear evidence' },
    'badge.analyzing':      { zh: '分析中',                                                            en: 'Analyzing' },
    'badge.unsuitable':     { zh: '不适用',                                                            en: 'Not applicable' },
    'badge.found':          { zh: '发现',                                                              en: 'Found' },
    'badge.notfound':       { zh: '未发现',                                                            en: 'Not found' },
    'badge.foundEdit':      { zh: '发现修图痕迹',                                                      en: 'Edit traces' },
    'badge.foundMarker':    { zh: '发现标记',                                                          en: 'Marker found' },
    'badge.bytesC2PA':      { zh: '字节中含 C2PA 字符串',                                              en: 'C2PA string in bytes' },
    'badge.c2pa.aiVerified':{ zh: 'AI 声明已验证 (${state})',                                          en: 'AI claim verified (${state})' },
    'badge.c2pa.verified':  { zh: '凭证已验证 (${state})',                                             en: 'Credential verified (${state})' },
    'badge.c2pa.invalid':   { zh: '凭证验证失败',                                                       en: 'Credential invalid' },
    'badge.c2pa.structure': { zh: '发现结构,未通过验证',                                               en: 'Structure found, not verified' },
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
    'det.desc.c2pa.aiVerified':{ zh: 'C2PA 签名和资源哈希验证通过,且凭证明确定义为算法生成内容。',     en: 'The C2PA signature and asset hash validate, and the credential declares algorithmic generation.' },
    'det.desc.c2pa.verified':{ zh: 'C2PA 签名和资源哈希验证通过;该凭证本身未声明图片由 AI 生成。',      en: 'The C2PA signature and asset hash validate; the credential does not itself declare AI generation.' },
    'det.desc.c2pa.invalid':{ zh: '发现 C2PA 容器,但签名、资源哈希或凭证结构验证失败。',                en: 'A C2PA container was found, but its signature, asset hash, or credential structure failed validation.' },
    'det.desc.c2pa.structure':{ zh: '发现 C2PA/JUMBF 结构,但没有得到可验证的有效凭证。',                en: 'A C2PA/JUMBF structure was found, but no verifiable valid credential was produced.' },
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
    'det.title.wm':         { zh: '文件字节统计（非水印验证）', en: 'File byte statistics (not watermark verification)' },
    'det.desc.wm.suspect':  { zh: '压缩文件字节分布受编码与元数据影响，不能识别像素水印或判断 AI 来源。', en: 'Compressed byte statistics depend on encoding and metadata; they cannot identify pixel watermarks or AI origin.' },
    'det.desc.wm.clean':    { zh: '字节统计无法确认或排除 SynthID 等隐形水印；频域分析也只提供启发式线索。', en: 'Byte statistics cannot confirm or rule out invisible watermarks such as SynthID; frequency analysis provides heuristic clues only.' },
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
    'freq.retryBtn':        { zh: '重试频域分析',                                                       en: 'Retry frequency analysis' },
    'freq.initializing':    { zh: '正在初始化像素分析...',                                             en: 'Initializing pixel analysis...' },
    'freq.stage.resize':    { zh: '缩放图像',                                                           en: 'Resizing image' },
    'freq.stage.features':  { zh: '提取频域特征',                                                       en: 'Extracting frequency features' },
    'freq.stage.score':     { zh: '计算启发式得分',                                                     en: 'Scoring heuristic evidence' },
    'freq.stage.viz':       { zh: '生成可视化',                                                         en: 'Rendering visualizations' },
    'freq.panelHint.html':  { zh: '提取 65 个频域特征:FFT 幅度谱、径向功率谱、相位一致性、LSB 偏置、小波子带能量……<br>在 Web Worker 中执行,不阻塞页面。耗时约 1-3 秒。', en: 'Extracts 65 frequency features: FFT magnitude, radial power spectrum, phase consistency, LSB bias, wavelet sub-bands…<br>Runs in a Web Worker so the UI stays responsive. ~1-3 s.' },
    'freq.disclaimer.tag':  { zh: '非专业分析',                                                         en: 'Not lab-grade' },
    'freq.disclaimer.text': { zh: '仅供参考 · 基于启发式规则,不等同于学术级分类器',                    en: 'Reference only · heuristic rules, not an academic classifier' },
    'freq.verdict.label':   { zh: '频域异常强度',                                                       en: 'Frequency anomaly level' },
    'freq.score':           { zh: '得分 ${total} · 正向证据 ${pos} · 反向 ${neg}',                     en: 'Score ${total} · pros ${pos} · cons ${neg}' },
    'freq.timing':          { zh: '分析分辨率 ${side}×${side} · 用时 ${ms}ms',                         en: 'Resolution ${side}×${side} · took ${ms}ms' },
    'freq.viz.fft':         { zh: 'FFT 幅度谱(对数)',                                                 en: 'FFT magnitude (log)' },
    'freq.viz.radial':      { zh: '径向功率谱',                                                         en: 'Radial power spectrum' },
    'freq.viz.fftHint':     { zh: 'DC 在中心 · 越亮表示频率能量越强 · AI 图像通常缺少随机传感器噪声', en: 'DC is centered · brighter means more energy · AI images often lack random sensor noise' },
    'freq.viz.radialHint':  { zh: '横轴为频率,纵轴为对数功率 · 真实照片通常近似 1/f 衰减',             en: 'Frequency on x-axis, log power on y-axis · real photos often approximate a 1/f falloff' },
    'freq.axis.low':        { zh: '低频',                                                               en: 'Low' },
    'freq.axis.high':       { zh: '高频',                                                               en: 'High' },
    'freq.votes.title':     { zh: '判定依据 (${n} 条触发)',                                             en: 'Rules fired (${n})' },
    'freq.votes.empty':     { zh: '没有规则被触发;当前特征不足以形成倾向。',                             en: 'No rules fired; the current features do not support a tendency.' },
    'freq.features.summary':{ zh: '全部特征值 (${n})',                                                  en: 'All feature values (${n})' },
    'freq.verdict.highAI':  { zh: '频域异常较强',                                                       en: 'Strong frequency anomalies' },
    'freq.verdict.hasAI':   { zh: '存在多类频域异常',                                                   en: 'Multiple frequency anomalies' },
    'freq.verdict.weak':    { zh: '轻微频域异常',                                                       en: 'Weak frequency anomalies' },
    'freq.verdict.real':    { zh: '未见明显频域异常',                                                   en: 'No obvious frequency anomalies' },
    'freq.verdict.unsure':  { zh: '特征模糊,无法判定',                                                 en: 'Inconclusive features' },
    'freq.err':             { zh: '频域分析失败: ${msg}',                                               en: 'Frequency analysis failed: ${msg}' },
    'freq.unsuitable.title':{ zh: '此图片不适合频域 AI 判断',                                           en: 'This image is not suitable for frequency AI analysis' },
    'freq.unsuitable.text': { zh: '频域规则主要针对自然照片。为避免高置信度误报,本次分析已停止输出 AI 倾向分数。', en: 'The frequency rules target photographic content. To avoid a high-confidence false positive, no AI-likelihood score is produced.' },
    'freq.unsuitable.reason.qrCode':{ zh: '检测到可解码的二维码。',                                     en: 'A decodable QR code was detected.' },
    'freq.unsuitable.reason.qrOrDocument':{ zh: '图像以高对比黑白区域和规则边缘为主,更接近二维码或文档。', en: 'The image is dominated by high-contrast binary regions and regular edges, resembling a QR code or document.' },
    'freq.unsuitable.reason.lowTexture':{ zh: '图像纹理和亮度变化过低,缺少可供照片模型判断的自然细节。', en: 'Texture and luminance variation are too low for a photo-oriented model.' },
    'freq.unsuitable.reason.graphicOrScreenshot':{ zh: '图像包含大面积平坦区域和锐利界面边缘,更接近插画或截图。', en: 'Large flat regions and sharp interface edges make this resemble a graphic or screenshot.' },
    'freq.unsuitable.reason.tooSmall':{ zh: '图像短边小于 32 像素,无法提取稳定的频域特征。',            en: 'The shorter side is below 32 pixels, so stable frequency features cannot be extracted.' },
    'freq.unsuitable.metrics':{ zh: '适用性指标',                                                        en: 'Suitability metrics' },

    // Convert tab
    'conv.sub':             { zh: '剥离 C2PA / AI 标记,重编码并注入相机 EXIF,让图片看起来像真实相机拍的。', en: 'Strip C2PA / AI markers, re-encode, and inject camera EXIF so the image looks camera-native.' },
    'conv.group.phone':     { zh: '手机',                                                               en: 'Phone' },
    'conv.group.dslr':      { zh: '无反 / 单反',                                                        en: 'Mirrorless / DSLR' },
    'conv.group.compact':   { zh: '紧凑 / 胶片感',                                                      en: 'Compact / Film-look' },
    'conv.wm.toggle':       { zh: '扰动像素级隐形水印',                                                  en: 'Disrupt pixel-level invisible watermark' },
    'conv.wm.hint':         { zh: '对像素应用扰动，用于比较处理前后的统计变化；未验证对 SynthID 等专用水印的去除效果。', en: 'Apply pixel perturbations to compare statistics before and after processing; removal of proprietary watermarks such as SynthID is unverified.' },
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
    'conv.tech.fftPhase.desc':{ zh: '真 2D-FFT 中频相位扰动 ±3-5°，效果待验证', en: 'Real 2D-FFT mid-band phase perturbation ±3-5°; effectiveness unverified' },
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
    'log.wmHeuristic':      { zh: '文件字节统计参考', en: 'File byte statistics' },
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
    'seo.description':      { zh: '免费 AI 图片检测工具。100% 在浏览器里运行,图片不上传。验证 C2PA / Content Credentials 来源凭证，检查生成工具元数据：OpenAI DALL·E / Sora / gpt-image、Google Gemini / Nano Banana、豆包 / Seedream、Qwen-Image、Midjourney、Stable Diffusion / SDXL / Flux、Adobe Firefly 等 AI 生成签名。提取 EXIF / XMP / IPTC / ICC 元数据,65 项频域特征启发式分析,支持去除元数据、扰动水印、注入相机 EXIF 伪装为真实照片。',
                              en: 'Free AI-image detector that runs 100% in your browser — images are never uploaded. Verifies C2PA / Content Credentials and inspects generator metadata: OpenAI DALL·E / Sora / gpt-image, Google Gemini / Nano Banana, Doubao / Seedream, Qwen-Image, Midjourney, Stable Diffusion / SDXL / Flux, Adobe Firefly and more. Parses EXIF / XMP / IPTC / ICC, 65-feature frequency-domain heuristic analysis, metadata stripping, watermark disruption, fake camera EXIF injection.' },
    'seo.keywords':         { zh: 'AI 图片检测,AI 生成图检测,C2PA,SynthID,Sora,DALL-E,gpt-image,Nano Banana,Midjourney,Stable Diffusion,SDXL,Flux,ComfyUI,Adobe Firefly,Gemini,Imagen,EXIF 分析,频域分析,图像水印检测,水印去除,图像溯源,image forensics,AI image detector,synthetic image detection,EXIF viewer online,C2PA verifier,watermark removal,客户端工具,零后端',
                              en: 'AI image detector, AI-generated image detection, C2PA verifier, Content Credentials, SynthID metadata clues, Sora detection, DALL-E detection, gpt-image, Nano Banana, Midjourney detector, Stable Diffusion detector, SDXL, Flux, ComfyUI, Adobe Firefly, Gemini, Imagen, EXIF viewer online, XMP parser, IPTC, JUMBF, frequency analysis, FFT image analysis, image forensics, watermark detection, watermark removal, synthetic image detection, diffusion model detection, client-side tool, no upload' },
    'seo.ogTitle':          { zh: 'AI 图片检测 · C2PA / SynthID / Sora / Midjourney / DALL-E 溯源 · 浏览器运行不上传',
                              en: 'AI Image Detector · C2PA / SynthID / Sora / Midjourney / DALL-E · Runs in your browser, no upload' },
    'seo.ogDescription':    { zh: '免费 AI 图片检测工具。验证 C2PA，检查生成工具元数据：OpenAI DALL-E / Sora / gpt-image、Midjourney、Stable Diffusion、Flux、Adobe Firefly、Gemini 等 AI 生成签名;读取 EXIF / XMP 元数据;65 项频域特征分析。100% 客户端,图片不上传。',
                              en: 'Free AI-image detector. Verifies C2PA and inspects generator metadata: OpenAI DALL-E / Sora / gpt-image, Midjourney, Stable Diffusion, Flux, Adobe Firefly, Gemini signatures. Parses EXIF / XMP. 65-feature frequency analysis. 100% client-side, no upload.' },
    'seo.twDescription':    { zh: '浏览器内运行的免费 AI 图片溯源 · C2PA / EXIF / 65 频域特征 · 零后端图片不上传',
                              en: 'Free in-browser AI image provenance · C2PA / EXIF / 65 frequency features · Zero backend, no upload' },
};

let _lang = null;

function detectLang() {
    const params = new URLSearchParams(globalThis.window?.location?.search || '');
    const fromUrl = params.get('lang');
    if (fromUrl === 'en' || fromUrl === 'zh') return fromUrl;
    let saved = null;
    try { saved = globalThis.localStorage?.getItem('lang'); } catch {}
    if (saved === 'en' || saved === 'zh') return saved;
    return /^zh\b/i.test(globalThis.navigator?.language || '') ? 'zh' : 'en';
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
    if (vars) for (const k in vars) s = s.replaceAll('${' + k + '}', vars[k]);
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
