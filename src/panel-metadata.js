// Metadata tab — shows editable metadata and the provenance evidence behind it.
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
import { t, getLang } from './i18n.js';
import { analyzeMetadataEvidence, normalizeGpsCoordinate } from './metadata-evidence.js';

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
    const signals = analyzeMetadataEvidence(m, jumbf, ctx.aigc);
    const verdictHtml = `
        <section class="md-verdict md-verdict-${signals.level}">
            <div class="md-verdict-icon">${signals.icon}</div>
            <div class="md-verdict-text">
                <div class="md-verdict-title">${escHtml(t(signals.titleKey))}</div>
                <div class="md-verdict-sub">${escHtml(t(signals.subKey))}</div>
            </div>
        </section>`;

    // ---- Camera ----
    const cameraRows = [
        row(t('meta.brand'), m.Make),
        row(t('meta.model'), m.Model),
        row('固件', m.Software),
        row(t('meta.lens'), m.LensModel || m.Lens),
        row(t('meta.lensMake'), m.LensMake),
        row(t('meta.lensSerial'), m.LensSerialNumber),
        row(t('meta.bodySerial'), m.BodySerialNumber || m.SerialNumber),
        row(t('meta.owner'), m.OwnerName || m.Artist),
    ];

    // ---- Capture params ----
    const captureRows = [
        row(t('meta.aperture'), m.FNumber ? `f/${m.FNumber}` : null),
        row(t('meta.shutter'), fmtExposure(m.ExposureTime)),
        row('ISO', m.ISO || m.ISOSpeedRatings),
        row(t('meta.focal'), m.FocalLength ? `${m.FocalLength}mm` : null),
        row(t('meta.focal35'), m.FocalLengthIn35mmFormat ? `${m.FocalLengthIn35mmFormat}mm (35mm)` : null),
        row(t('meta.exposure'), m.ExposureCompensation != null ? `${m.ExposureCompensation > 0 ? '+' : ''}${m.ExposureCompensation} EV` : null),
        row(t('meta.program'), m.ExposureProgram),
        row(t('meta.metering'), m.MeteringMode),
        row(t('meta.whiteBalance'), m.WhiteBalance),
        row(t('meta.flash'), typeof m.Flash === 'string' ? m.Flash : m.Flash != null ? (m.Flash === 0 ? t('meta.flashOff') : t('meta.flashOn')) : null),
    ];

    // ---- Time ----
    const formatDate = d => d instanceof Date && Number.isFinite(d.getTime())
        ? d.toLocaleString(getLang() === 'zh' ? 'zh-CN' : 'en-US') : d ? String(d) : null;
    const timeRows = [
        row(t('meta.taken'), formatDate(m.DateTimeOriginal)),
        row(t('meta.digitized'), formatDate(m.DateTimeDigitized || m.CreateDate)),
        row(t('meta.modified'), formatDate(m.ModifyDate || m.DateTime)),
    ];

    // ---- GPS ----
    const lat = normalizeGpsCoordinate(m.latitude ?? m.GPSLatitude, m.latitude != null ? null : m.GPSLatitudeRef, 90);
    const lon = normalizeGpsCoordinate(m.longitude ?? m.GPSLongitude, m.longitude != null ? null : m.GPSLongitudeRef, 180);
    const alt = m.GPSAltitude;
    const hasGps = lat != null && lon != null;
    const gpsRows = hasGps ? [
        row(t('meta.coordinates'), `${lat.toFixed(6)}, ${lon.toFixed(6)}`),
        row('DMS', `${fmtCoord(lat, m.GPSLatitudeRef || (lat >= 0 ? 'N' : 'S'))}  /  ${fmtCoord(lon, m.GPSLongitudeRef || (lon >= 0 ? 'E' : 'W'))}`),
        row(t('meta.altitude'), alt != null ? `${typeof alt === 'number' ? alt.toFixed(1) : alt}m` : null),
        row(t('meta.direction'), m.GPSImgDirection != null ? `${m.GPSImgDirection}° ${m.GPSImgDirectionRef || ''}` : null),
        row(t('meta.gpsTime'), formatDate(m.GPSDateStamp || m.GPSTimeStamp)),
    ] : [];
    const gpsNote = hasGps
        ? t('meta.gpsWarning')
        : null;
    const gpsExtra = hasGps ? `<div class="md-actions">
        <a class="btn-secondary btn-xs" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15">${escHtml(t('meta.map'))}</a>
    </div>` : '';

    // ---- Image properties ----
    const imgRows = [
        row(t('meta.dimensions'), ctx.dims),
        row(t('meta.colorSpace'), m.ColorSpace === 1 || m.ColorSpace === 'sRGB' ? 'sRGB' : m.ColorSpace),
        row(t('meta.icc'), m.ProfileDescription || m.ICC_Profile_Description),
        row(t('meta.direction'), m.Orientation),
        row(t('meta.resolution'), m.XResolution ? `${m.XResolution} × ${m.YResolution || m.XResolution} DPI` : null),
    ];

    // ---- Editing history (Photoshop) ----
    const hist = m.History || m['xmpMM:History'] || m.historyItems;
    let histHtml = '';
    if (Array.isArray(hist) && hist.length) {
        const items = hist.filter(h => h && typeof h === 'object').slice(0, 20).map(h => {
            const action = h.action || h.Action || '—';
            const when = h.when ? formatDate(h.when) : '';
            const soft = h.softwareAgent || h.SoftwareAgent || '';
            return `<li><span class="md-hist-action">${escHtml(action)}</span> <span class="md-hist-meta">${escHtml(soft)} ${escHtml(when)}</span></li>`;
        }).join('');
        histHtml = `<section class="md-section">
            <h4 class="md-section-title">${escHtml(t('meta.history'))} <span class="md-count">${hist.length}</span></h4>
            <ol class="md-hist">${items}</ol>
        </section>`;
    }

    // ---- C2PA ----
    let c2paHtml = '';
    if (jumbf.present || jumbf.verification?.present) {
        const verification = jumbf.verification || {};
        const c2paRows = [
            row(t('meta.sourceType'), verification.digitalSourceType || t('meta.notDeclared')),
            row(t('meta.claimGenerator'), verification.claimGenerator || '—'),
            row(t('meta.failures'), (verification.failure || []).map(s => s.code).join(', ') || '—'),
            row(t('meta.integrity'), verification.verified ? t('meta.valid') : verification.invalid ? t('meta.invalid') : t('meta.unverified')),
            row(t('meta.signerTrust'), verification.trusted ? t('meta.trusted') : t('meta.trustUnconfirmed')),
            row('JUMBF boxes', jumbf.indices?.length ?? 0),
            row('Labels', jumbf.labels?.join(', ') || '—'),
        ];
        c2paHtml = section('C2PA / Content Credentials', c2paRows, { accent: 'accent' });
    }

    const aigc = ctx.aigc;
    const aigcHtml = aigc && aigc.status !== 'absent' ? section(t('det.aigc.title'), [
        row(t('meta.declaration'), t('det.aigc.' + (aigc.status === 'present' ? aigc.declaration : aigc.status))),
        ...(aigc.labels || []).flatMap(label => [
            ...Object.entries(label.fields).map(([key, value]) => row(t('det.aigc.field.' + key), value || '—')),
            row(t('det.aigc.field.location'), label.sources.join(', ')),
            row(t('det.aigc.field.issues'), label.issues.join(', ')),
        ]),
        row(t('det.aigc.field.issues'), aigc.warnings?.join(', ')),
    ], { note: t('det.aigc.description'), accent: 'accent' }) : '';

    // ---- Raw dump ----
    const rawLines = [];
    for (const [k, v] of Object.entries(m)) {
        if (k.startsWith('_')) continue;
        let vs = v;
        if (v instanceof Date) vs = Number.isFinite(v.getTime()) ? v.toISOString() : String(v);
        else if (typeof v === 'object') vs = JSON.stringify(v);
        else if (typeof v === 'number') vs = v.toString();
        rawLines.push(`${k}: ${vs}`);
    }
    const rawHtml = rawLines.length ? `<details class="md-raw">
        <summary>${escHtml(t('meta.raw'))} (${rawLines.length})</summary>
        <pre>${escHtml(rawLines.join('\n'))}</pre>
    </details>` : '';

    container.innerHTML = `
        ${verdictHtml}
        ${c2paHtml}
        ${aigcHtml}
        ${section(t('meta.cameraSection'), cameraRows)}
        ${section(t('meta.captureSection'), captureRows)}
        ${section(t('meta.timeSection'), timeRows)}
        ${hasGps ? section(t('meta.gpsSection'), gpsRows, { note: gpsNote, noteType: 'warn', accent: 'accent' }) + gpsExtra : ''}
        ${section(t('meta.imageSection'), imgRows)}
        ${histHtml}
        ${!hasAny && !jumbf.present && !jumbf.verification?.present && (!aigc || aigc.status === 'absent') ? `<section class="md-empty">${escHtml(t('meta.empty'))}</section>` : ''}
        ${rawHtml}
    `;
}
