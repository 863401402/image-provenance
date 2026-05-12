// Metadata tab — shows all the "this is a real photo" info exifr extracted.
// Categories:
//   1. Verdict (real-photo signals vs AI signals)
//   2. Camera & lens
//   3. Capture parameters (aperture/shutter/ISO/focal/EV…)
//   4. Time
//   5. GPS (with privacy warning)
//   6. Image properties (colorspace, orientation, dimensions)
//   7. Editing history (XMP:MM:History if present)
//   8. Raw dump (collapsible)

import { escHtml } from './utils.js';

function fmtExposure(t) {
    if (t == null) return null;
    if (typeof t === 'number') {
        if (t >= 1) return `${t}s`;
        return `1/${Math.round(1 / t)}s`;
    }
    if (Array.isArray(t) && t.length === 2) {
        const [num, den] = t;
        if (num / den >= 1) return `${(num / den).toFixed(1)}s`;
        return `${num}/${den}s`;
    }
    return String(t);
}

function fmtCoord(deg, ref) {
    if (deg == null) return null;
    const d = Math.abs(deg);
    const dd = Math.floor(d);
    const mm = Math.floor((d - dd) * 60);
    const ss = ((d - dd - mm / 60) * 3600).toFixed(2);
    return `${dd}°${mm}'${ss}" ${ref || (deg >= 0 ? '' : '-')}`;
}

function row(label, value, mono = false) {
    if (value == null || value === '') return '';
    return `<div class="md-row"><span class="md-label">${escHtml(label)}</span><span class="md-value${mono ? ' mono' : ''}">${escHtml(value)}</span></div>`;
}

function section(title, rows, opts = {}) {
    const content = rows.filter(Boolean).join('');
    if (!content) return '';
    const note = opts.note ? `<div class="md-note ${opts.noteType || ''}">${escHtml(opts.note)}</div>` : '';
    return `<section class="md-section ${opts.accent || ''}">
        <h4 class="md-section-title">${escHtml(title)}${opts.count ? ` <span class="md-count">${opts.count}</span>` : ''}</h4>
        ${note}
        <div class="md-rows">${content}</div>
    </section>`;
}

export function renderMetadataPanel(container, ctx) {
    const m = ctx.meta || {};
    const jumbf = ctx.jumbf || {};
    const file = ctx.file;
    const hasAny = Object.keys(m).filter(k => !k.startsWith('_')).length > 0;

    // ---- Verdict strip ----
    const signals = analyzeVerdict(m, jumbf);
    const verdictHtml = `
        <section class="md-verdict md-verdict-${signals.level}">
            <div class="md-verdict-icon">${signals.icon}</div>
            <div class="md-verdict-text">
                <div class="md-verdict-title">${escHtml(signals.title)}</div>
                <div class="md-verdict-sub">${escHtml(signals.sub)}</div>
            </div>
        </section>`;

    // ---- Camera ----
    const cameraRows = [
        row('品牌', m.Make),
        row('型号', m.Model),
        row('固件', m.Software),
        row('镜头', m.LensModel || m.Lens),
        row('镜头厂', m.LensMake),
        row('镜头序列号', m.LensSerialNumber),
        row('机身序列号', m.BodySerialNumber || m.SerialNumber),
        row('所有者', m.OwnerName || m.Artist),
    ];

    // ---- Capture params ----
    const captureRows = [
        row('光圈', m.FNumber ? `f/${m.FNumber}` : null),
        row('快门', fmtExposure(m.ExposureTime)),
        row('ISO', m.ISO || m.ISOSpeedRatings),
        row('焦距', m.FocalLength ? `${m.FocalLength}mm` : null),
        row('等效焦距', m.FocalLengthIn35mmFormat ? `${m.FocalLengthIn35mmFormat}mm (35mm)` : null),
        row('曝光补偿', m.ExposureCompensation != null ? `${m.ExposureCompensation > 0 ? '+' : ''}${m.ExposureCompensation} EV` : null),
        row('曝光程序', m.ExposureProgram),
        row('测光模式', m.MeteringMode),
        row('白平衡', m.WhiteBalance),
        row('闪光灯', typeof m.Flash === 'string' ? m.Flash : m.Flash != null ? (m.Flash === 0 ? '未闪光' : '已闪光') : null),
    ];

    // ---- Time ----
    const formatDate = d => d instanceof Date ? d.toLocaleString('zh-CN') : d ? String(d) : null;
    const timeRows = [
        row('拍摄时间', formatDate(m.DateTimeOriginal)),
        row('数字化时间', formatDate(m.DateTimeDigitized || m.CreateDate)),
        row('最后修改', formatDate(m.ModifyDate || m.DateTime)),
    ];

    // ---- GPS ----
    const lat = m.latitude != null ? m.latitude : m.GPSLatitude;
    const lon = m.longitude != null ? m.longitude : m.GPSLongitude;
    const alt = m.GPSAltitude;
    const hasGps = lat != null && lon != null;
    const gpsRows = hasGps ? [
        row('经纬度', `${lat.toFixed(6)}, ${lon.toFixed(6)}`),
        row('DMS', `${fmtCoord(lat, m.GPSLatitudeRef || (lat >= 0 ? 'N' : 'S'))}  /  ${fmtCoord(lon, m.GPSLongitudeRef || (lon >= 0 ? 'E' : 'W'))}`),
        row('海拔', alt != null ? `${typeof alt === 'number' ? alt.toFixed(1) : alt}m` : null),
        row('方向', m.GPSImgDirection != null ? `${m.GPSImgDirection}° ${m.GPSImgDirectionRef || ''}` : null),
        row('时间戳 (UTC)', formatDate(m.GPSDateStamp || m.GPSTimeStamp)),
    ] : [];
    const gpsNote = hasGps
        ? '⚠️ 这张图附带精确 GPS 坐标,分享前建议用「转换」标签页剥离元数据。'
        : null;
    const gpsExtra = hasGps ? `<div class="md-actions">
        <a class="btn-secondary btn-xs" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15">在 OpenStreetMap 查看</a>
    </div>` : '';

    // ---- Image properties ----
    const imgRows = [
        row('尺寸', ctx.dims),
        row('色彩空间', m.ColorSpace === 1 || m.ColorSpace === 'sRGB' ? 'sRGB' : m.ColorSpace),
        row('ICC 配置', m.ProfileDescription || m.ICC_Profile_Description),
        row('方向', m.Orientation),
        row('分辨率', m.XResolution ? `${m.XResolution} × ${m.YResolution || m.XResolution} DPI` : null),
    ];

    // ---- Editing history (Photoshop) ----
    const hist = m.History || m['xmpMM:History'] || m.historyItems;
    let histHtml = '';
    if (Array.isArray(hist) && hist.length) {
        const items = hist.slice(0, 20).map(h => {
            const action = h.action || h.Action || '—';
            const when = h.when ? formatDate(h.when) : '';
            const soft = h.softwareAgent || h.SoftwareAgent || '';
            return `<li><span class="md-hist-action">${escHtml(action)}</span> <span class="md-hist-meta">${escHtml(soft)} ${escHtml(when)}</span></li>`;
        }).join('');
        histHtml = `<section class="md-section">
            <h4 class="md-section-title">编辑历史 <span class="md-count">${hist.length}</span></h4>
            <ol class="md-hist">${items}</ol>
        </section>`;
    }

    // ---- C2PA ----
    let c2paHtml = '';
    if (jumbf.present) {
        const c2paRows = [
            row('DigitalSourceType', jumbf.digitalSourceType || '未声明'),
            row('JUMBF boxes', jumbf.indices.length),
            row('Labels', jumbf.labels.join(', ') || '—'),
        ];
        c2paHtml = section('C2PA / Content Credentials', c2paRows, { accent: 'accent' });
    }

    // ---- Raw dump ----
    const rawLines = [];
    for (const [k, v] of Object.entries(m)) {
        if (k.startsWith('_')) continue;
        let vs = v;
        if (v instanceof Date) vs = v.toISOString();
        else if (typeof v === 'object') vs = JSON.stringify(v);
        else if (typeof v === 'number') vs = v.toString();
        rawLines.push(`${k}: ${vs}`);
    }
    const rawHtml = rawLines.length ? `<details class="md-raw">
        <summary>全部原始字段 (${rawLines.length})</summary>
        <pre>${escHtml(rawLines.join('\n'))}</pre>
    </details>` : '';

    container.innerHTML = `
        ${verdictHtml}
        ${c2paHtml}
        ${section('相机与镜头', cameraRows)}
        ${section('拍摄参数', captureRows)}
        ${section('时间', timeRows)}
        ${hasGps ? section('地理位置', gpsRows, { note: gpsNote, noteType: 'warn', accent: 'accent' }) + gpsExtra : ''}
        ${section('图像属性', imgRows)}
        ${histHtml}
        ${!hasAny && !jumbf.present ? '<section class="md-empty">这张图几乎不含任何元数据 —— 要么被剥离过,要么源自 AI 生成或截图。</section>' : ''}
        ${rawHtml}
    `;
}

function analyzeVerdict(m, jumbf) {
    // "Strong real" signals
    const hasCamera = !!(m.Make && m.Model);
    const hasLens = !!(m.LensModel || m.Lens);
    const hasCaptureParams = m.FNumber && m.ExposureTime && (m.ISO || m.ISOSpeedRatings);
    const hasGps = m.latitude != null || m.GPSLatitude != null;
    const hasMakerNote = !!(m.MakerNote || m.makerNote);
    const c2paAi = jumbf?.digitalSourceType && ['trainedAlgorithmicMedia',
        'compositeWithTrainedAlgorithmicMedia', 'algorithmicMedia', 'dataDrivenMedia']
        .includes(jumbf.digitalSourceType);
    const c2paReal = jumbf?.digitalSourceType === 'digitalCapture';
    const softIsAi = /Midjourney|Stable|Diffusion|ComfyUI|DALL|OpenAI|Firefly|Gemini|Imagen/i.test(m.Software || '');

    if (c2paAi || softIsAi) {
        return { level: 'ai', icon: '🤖', title: '元数据直接声明 AI 生成',
            sub: (softIsAi ? `Software 字段: ${m.Software}` : `C2PA DigitalSourceType: ${jumbf.digitalSourceType}`) };
    }
    if (c2paReal) {
        return { level: 'strong', icon: '📸', title: '相机原生 C2PA 凭证',
            sub: `C2PA DigitalSourceType = digitalCapture · 设备厂商签名可验证` };
    }
    let realScore = 0;
    if (hasCamera) realScore++;
    if (hasLens) realScore++;
    if (hasCaptureParams) realScore += 2;
    if (hasMakerNote) realScore += 2;
    if (hasGps) realScore++;

    if (realScore >= 4) return { level: 'strong', icon: '📸',
        title: '强烈指向真实相机拍摄',
        sub: '元数据包含相机/镜头/拍摄参数/厂商私有字段,AI 图片通常无法伪造所有这些。' };
    if (realScore >= 2) return { level: 'medium', icon: '📷',
        title: '有相机元数据痕迹',
        sub: '部分相机字段存在,但不足以确认未被伪造。' };
    if (hasCamera) return { level: 'weak', icon: '📎',
        title: '仅有基础相机字段',
        sub: 'Make/Model 存在,但缺少拍摄参数等强证据。可能经过了重压缩或软件处理。' };
    return { level: 'none', icon: '○',
        title: '无可用元数据',
        sub: '图片几乎不含元数据。可能来自截图、社交媒体重编码,或本就是 AI 生成。' };
}
