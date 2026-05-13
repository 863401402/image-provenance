// Entry point — wires upload UI, runs detections, renders results.

import { sha256, formatSize, getImageDims, escHtml } from './utils.js';
import { runAllDetections } from './detect.js';
import { CAMERA_PROFILES, CAMERA_GROUPS, GPS_PRESETS } from './cameras.js';
import { convertImage } from './convert.js';
import { disruptWatermark, PRESETS } from './watermark.js';
import { analyzeFrequency } from './frequency/index.js';
import { renderFrequencyPanel } from './frequency/panel.js';
import { parseMetadata, sniffJumbf, getGenerationHints } from './metadata.js';
import { renderMetadataPanel } from './panel-metadata.js';
import { initStats, trackAnalysis, trackConversion } from './stats.js';
import { getLang, setLang, applyI18n, t, refineLangByIP } from './i18n.js';

// Apply i18n to static markup immediately so the first paint is in the
// right language. Dynamic renders below use t() lookups.
applyI18n();
// On first visit, refine using IP geo (CN/HK/TW/SG/MO → zh, else en).
// Only fires if no manual choice has been made; safe on failure.
refineLangByIP();

// Kick off stats collection (safe on failure — stats just stay dashed)
initStats();

let selectedProfile = 'iphone17promax';
let currentFile = null;
let currentBytes = null;
let currentMeta = null, currentJumbf = null;
let lastFreqBytes = null, lastFreqResult = null;

// ================= Camera selector (grouped) =================
const sel = document.getElementById('cameraSelector');
function renderCameraSelector() {
    const groupHtml = CAMERA_GROUPS.map(g => {
        const cams = Object.entries(CAMERA_PROFILES).filter(([, c]) => c.group === g.id);
        const cells = cams.map(([key, cam]) => `
            <div class="camera-option ${key === selectedProfile ? 'selected' : ''}" data-key="${key}">
                <div class="icon">${cam.icon}</div>
                <div class="name">${escHtml(cam.displayName)}</div>
                <div class="model">${escHtml(cam.Make)}</div>
            </div>`).join('');
        return `<div class="camera-group">
            <div class="camera-group-title">${g.icon} ${escHtml(t('conv.group.' + g.id))} <span class="camera-group-count">${cams.length}</span></div>
            <div class="camera-grid">${cells}</div>
        </div>`;
    }).join('');
    sel.innerHTML = groupHtml;
}
renderCameraSelector();
sel.addEventListener('click', (e) => {
    const opt = e.target.closest('.camera-option');
    if (!opt) return;
    sel.querySelectorAll('.camera-option').forEach(n => n.classList.remove('selected'));
    opt.classList.add('selected');
    selectedProfile = opt.dataset.key;
});

// ================= Advanced panel init =================
const gpsSel = document.getElementById('advGps');
function renderGpsOptions() {
    if (!gpsSel) return;
    gpsSel.innerHTML = Object.keys(GPS_PRESETS).map(k =>
        `<option value="${k}">${escHtml(t('gps.' + k))}</option>`).join('');
}
renderGpsOptions();
const dateSel = document.getElementById('advDatePreset');
const dateCustom = document.getElementById('advDateCustom');
dateSel?.addEventListener('change', () => {
    dateCustom.classList.toggle('hidden', dateSel.value !== 'custom');
});
const qMode = document.getElementById('advQualityMode');
const qRange = document.getElementById('advQuality');
const qVal = document.getElementById('advQualityVal');
qMode?.addEventListener('change', () => {
    const custom = qMode.value === 'custom';
    qRange.classList.toggle('hidden', !custom);
    qVal.classList.toggle('hidden', !custom);
});
qRange?.addEventListener('input', () => { qVal.textContent = qRange.value; });

function resolveAdvanced() {
    const adv = { orientation: parseInt(document.getElementById('advOrientation').value, 10) || 1 };
    // date
    const dp = dateSel.value;
    if (dp === 'now') {
        adv.dateTime = new Date();
    } else if (dp === 'custom') {
        adv.dateTime = dateCustom.value ? new Date(dateCustom.value) : new Date();
    } else {
        const map = { '-1h': 3600e3, '-1d': 864e5, '-7d': 7*864e5, '-30d': 30*864e5, '-365d': 365*864e5 };
        adv.dateTime = new Date(Date.now() - (map[dp] || 0));
    }
    // gps
    const gp = GPS_PRESETS[gpsSel.value];
    if (gp && gp.lat != null) adv.gps = { lat: gp.lat, lon: gp.lon };
    // iso / fnumber / shutter
    const iso = parseFloat(document.getElementById('advIso').value);
    const fn = parseFloat(document.getElementById('advFNumber').value);
    const shutter = parseFloat(document.getElementById('advShutterDen').value);
    if (!isNaN(iso)) adv.iso = Math.round(iso);
    if (!isNaN(fn)) adv.fNumber = fn;
    if (!isNaN(shutter) && shutter >= 1) adv.exposureTime = [1, Math.round(shutter)];
    return adv;
}

function resolveQuality() {
    if (qMode.value === 'custom') return parseInt(qRange.value, 10) / 100;
    return 0.88 + Math.random() * 0.07;   // 88..95
}

// ================= Upload handling =================
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
uploadArea.addEventListener('click', (e) => {
    if (e.target.closest('input, button, a')) return;
    fileInput.click();
});
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });

document.getElementById('btnChangeFile')?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

// ================= Intensity slider =================
const wmRange = document.getElementById('wmIntensity');
const wmLabel = document.getElementById('wmIntensityVal');
if (wmRange && wmLabel) wmRange.addEventListener('input', () => { wmLabel.textContent = wmRange.value; });

// ================= Watermark preset / technique selection =================
let currentPreset = 'rec';   // default matches the old behavior for most cases

function applyPresetToToggles(preset) {
    const ids = PRESETS[preset]?.techniques || [];
    document.querySelectorAll('#techGrid input[type="checkbox"]').forEach(cb => {
        cb.checked = ids.includes(cb.dataset.tech);
    });
}

function setPresetUI(preset) {
    currentPreset = preset;
    document.querySelectorAll('.preset-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.preset === preset));
    const grid = document.getElementById('techGrid');
    const isCustom = preset === 'custom';
    grid.classList.toggle('is-locked', !isCustom);
    grid.classList.toggle('is-open', isCustom);
    if (!isCustom) applyPresetToToggles(preset);
}

document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('.preset-btn');
    if (!b) return;
    setPresetUI(b.dataset.preset);
});
// When the user flips a toggle, silently switch to custom if it no longer
// matches the active preset.
document.addEventListener('change', (ev) => {
    if (!ev.target.matches || !ev.target.matches('#techGrid input[type="checkbox"]')) return;
    if (currentPreset !== 'custom') {
        // compare current toggle state with preset
        const preset = PRESETS[currentPreset].techniques;
        const actual = Array.from(document.querySelectorAll('#techGrid input:checked'))
            .map(cb => cb.dataset.tech);
        const same = preset.length === actual.length && preset.every(t => actual.includes(t));
        if (!same) setPresetUI('custom');
    }
});

// Initialize default preset UI on load
setPresetUI(currentPreset);

// Hide wm-controls when the main toggle is off (default).
const wmMainToggle = document.getElementById('chkDisruptWatermark');
const wmControls = document.getElementById('wmControls');
function syncWmControlsVisibility() {
    if (!wmControls) return;
    wmControls.style.display = wmMainToggle?.checked ? '' : 'none';
}
wmMainToggle?.addEventListener('change', syncWmControlsVisibility);
syncWmControlsVisibility();

function resolveTechniques() {
    return Array.from(document.querySelectorAll('#techGrid input:checked'))
        .map(cb => cb.dataset.tech);
}

// ================= Progressive analysis log =================
// Pins every step to ≥ minMs so the user sees the work happen. Prevents the
// "instant flash" problem where a 20MB image seems to analyze in 0ms.

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runStep(log, text, fn, minMs = 260, tone = 'done') {
    const line = document.createElement('div');
    line.className = 'log-line pending';
    line.innerHTML = `<span class="log-mark"></span><span class="log-text">${escHtml(text)}<span class="trail"></span></span>`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    const t0 = performance.now();
    const result = await fn();
    const elapsed = performance.now() - t0;
    if (elapsed < minMs) await sleep(minMs - elapsed);
    line.classList.remove('pending');
    line.classList.add('done');
    if (tone !== 'done') line.classList.add(tone);
    const detail = typeof result === 'object' && result?.detail;
    line.querySelector('.log-mark').innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8.5 6.5 12 13 4.5"/></svg>`;
    if (detail) {
        line.querySelector('.log-text').innerHTML = `${escHtml(text)} <span class="log-detail">${escHtml(detail)}</span>`;
    } else {
        line.querySelector('.log-text').textContent = text;
    }
    return result?.value !== undefined ? result.value : result;
}

// ================= Main file handler =================
const emptyState = document.getElementById('emptyState');
const resultView = document.getElementById('resultView');
const previewBlock = document.getElementById('previewBlock');
const analysisLog = document.getElementById('analysisLog');

async function handleFile(file) {
    currentFile = file;
    lastFreqBytes = null; lastFreqResult = null;

    // Reset UI to reveal result view
    emptyState.classList.add('hidden');
    resultView.classList.remove('hidden');
    previewBlock.classList.remove('hidden');
    uploadArea.classList.add('hidden');   // ← hide the big uploader; "换一张" button on the preview handles re-upload
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'detect'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== 'detect'));

    // Reset freq panel to pristine
    const freqPanel = document.getElementById('freqPanel');
    if (freqPanel) freqPanel.innerHTML = `
        <div class="freq-disclaimer">
            <span class="freq-disclaimer-tag">${escHtml(t('freq.disclaimer.tag'))}</span>
            <span>${escHtml(t('freq.disclaimer.text'))}</span>
        </div>
        <button class="btn-primary" id="btnRunFreq">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ${escHtml(t('freq.runBtn'))}
        </button>
        <p class="panel-hint">${t('freq.panelHint.html')}</p>`;
    document.getElementById('metadataPanel').innerHTML = '';
    document.getElementById('detectionItems').innerHTML = '';
    document.getElementById('convertResult').style.display = 'none';
    document.getElementById('btnConvert').disabled = false;

    // Show preview immediately
    document.getElementById('previewImg').src = URL.createObjectURL(file);
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileType').textContent = '—';
    document.getElementById('fileSize').textContent = formatSize(file.size);
    document.getElementById('fileDims').textContent = '…';
    document.getElementById('fileHash').textContent = '…';

    // Hide summary + badge until analysis finishes
    document.getElementById('headerTitle').textContent = t('result.analyzing');
    document.getElementById('headerSubtitle').textContent = '';
    document.getElementById('headerBadge').textContent = '';
    document.getElementById('headerBadge').className = 'pill';

    analysisLog.innerHTML = '';
    analysisLog.classList.remove('hidden');

    try {
        const buffer = await runStep(analysisLog, t('log.readBytes'), async () => {
            const b = await file.arrayBuffer();
            return { value: b, detail: `${formatSize(b.byteLength)}` };
        }, 180);
        const uint8 = new Uint8Array(buffer);
        currentBytes = uint8;

        const hashHex = await runStep(analysisLog, t('log.sha256'), async () => {
            const h = await sha256(buffer);
            return { value: h, detail: `${h.slice(0, 16)}…` };
        }, 240);
        document.getElementById('fileHash').textContent = hashHex;

        const fileType = file.type === 'image/png' ? 'PNG'
            : file.type === 'image/jpeg' ? 'JPEG'
            : file.type === 'image/webp' ? 'WebP' : (file.type || '—');
        document.getElementById('fileType').textContent = fileType;

        getImageDims(file).then(d => { document.getElementById('fileDims').textContent = d; });

        await runStep(analysisLog, t('log.jumbf'), async () => {
            currentJumbf = sniffJumbf(uint8);
            const jumbfDetail = currentJumbf.present
                ? t('log.jumbfHit', { n: currentJumbf.indices.length }) + (currentJumbf.digitalSourceType ? ` · ${currentJumbf.digitalSourceType}` : '')
                : t('log.jumbfNone');
            return { detail: jumbfDetail };
        }, 320, currentJumbf?.present ? 'hit' : 'done');

        await runStep(analysisLog, t('log.exif'), async () => {
            currentMeta = await parseMetadata(uint8);
            const keys = Object.keys(currentMeta).filter(k => !k.startsWith('_'));
            return { detail: keys.length ? t('log.fieldsCount', { n: keys.length }) : t('log.noMeta') };
        }, 420);

        const { detections } = await runStep(analysisLog, t('log.markers'), async () => {
            const res = await runAllDetections(uint8);
            const hits = res.detections.filter(d => d.hit && d.category !== 'edit'
                && (d.confidence === 'strong' || d.confidence === 'medium')).length;
            return { value: res, detail: hits ? t('log.hits', { n: hits }) : t('log.allNeg') };
        }, 360, 'done');

        await runStep(analysisLog, t('log.wmHeuristic'), () => sleep(200), 320);

        // Render results. Only strong/medium confidence counts as HIT.
        const aiHits = detections.filter(d => d.hit && d.category !== 'edit'
            && (d.confidence === 'strong' || d.confidence === 'medium'));
        const weakOnly = detections.filter(d => d.hit && d.category !== 'edit'
            && d.confidence === 'weak');
        const editHits = detections.filter(d => d.hit && d.category === 'edit');
        const anyHit = aiHits.length > 0;
        document.getElementById('headerTitle').textContent = anyHit ? t('result.aiHit') : t('result.aiClean');
        document.getElementById('headerSubtitle').textContent = anyHit
            ? t('result.aiHitSub')
            : weakOnly.length ? t('result.weakSub')
            : editHits.length ? t('result.editSub')
            : t('result.cleanSub');
        const hb = document.getElementById('headerBadge');
        hb.textContent = anyHit ? t('badge.hit') : t('badge.miss');
        hb.className = 'pill ' + (anyHit ? 'badge-hit' : 'badge-clean');

        // Fade log out, reveal detection items
        await sleep(350);
        analysisLog.classList.add('hidden');

        const container = document.getElementById('detectionItems');
        container.innerHTML = '';
        detections.forEach(d => {
            const div = document.createElement('div');
            div.className = 'detection-item';
            const detailHtml = d.detail
                ? `<details class="detection-item-details"><summary>${escHtml(t('det.detail.viewMore'))}</summary><pre class="detection-item-detail">${escHtml(d.detail)}</pre></details>`
                : '';
            const confHtml = d.confidence ? `<span class="conf conf-${d.confidence}">${escHtml(t('conf.' + d.confidence))}</span>` : '';
            div.innerHTML = `
                <div class="detection-item-header">
                    <span class="detection-item-title">${escHtml(d.title)}${confHtml}</span>
                    <span class="badge ${d.badgeClass}">${escHtml(d.badgeText)}</span>
                </div>
                <div class="detection-item-desc">${escHtml(d.desc)}</div>
                ${detailHtml}
            `;
            container.appendChild(div);
        });

        // Render metadata tab lazily on first activation (see tab handler below)
        document.getElementById('metadataPanel')._pending = true;
        trackAnalysis();   // bump public analysis counter
    } catch (err) {
        const errLine = document.createElement('div');
        errLine.className = 'log-line done hit';
        errLine.innerHTML = `<span class="log-mark">✕</span><span class="log-text">${escHtml(t('log.err', { msg: err.message }))}</span>`;
        analysisLog.appendChild(errLine);
    }
}

// ================= Tab switching =================
document.addEventListener('click', (ev) => {
    const btn = ev.target.closest && ev.target.closest('.tab-btn');
    if (!btn) return;
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== target));

    if (target === 'meta') {
        const panel = document.getElementById('metadataPanel');
        if (panel._pending && currentMeta) {
            renderMetadataPanel(panel, {
                meta: currentMeta, jumbf: currentJumbf,
                file: currentFile, dims: document.getElementById('fileDims').textContent,
            });
            panel._pending = false;
        }
    }
});

// ================= Frequency trigger =================
document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest && ev.target.closest('#btnRunFreq');
    if (!btn) return;
    if (!currentFile || !currentBytes) return;
    const panel = document.getElementById('freqPanel');
    if (lastFreqBytes === currentBytes && lastFreqResult) {
        renderFrequencyPanel(panel, lastFreqResult);
        return;
    }
    btn.disabled = true;
    panel.innerHTML = `
        <div class="loading"><div class="spinner"></div><br>
        <span id="freqStage">初始化...</span></div>`;
    try {
        const result = await analyzeFrequency(currentBytes, currentFile.type || 'image/jpeg', {
            onProgress: ({ stage, pct, info }) => {
                const el = document.getElementById('freqStage');
                if (el) el.textContent = `[${pct}%] ${stage}${info ? ' · ' + info : ''}`;
            },
        });
        lastFreqBytes = currentBytes;
        lastFreqResult = result;
        renderFrequencyPanel(panel, result);
    } catch (err) {
        panel.innerHTML = `<div style="color:var(--danger);font-weight:600;padding:16px">${escHtml(t('freq.err', { msg: err.message }))}</div>`;
    }
});

// ================= Convert =================
document.getElementById('btnConvert').addEventListener('click', async () => {
    if (!currentFile || !currentBytes) return;
    const btn = document.getElementById('btnConvert');
    const resultDiv = document.getElementById('convertResult');
    resultDiv.style.display = 'block';
    resultDiv.className = 'convert-result';
    resultDiv.innerHTML = `<div class="loading"><div class="spinner"></div>${escHtml(t('conv.processing'))}</div>`;
    btn.disabled = true;

    try {
        const profile = CAMERA_PROFILES[selectedProfile];
        const disrupt = document.getElementById('chkDisruptWatermark')?.checked;
        const intensity = parseInt(document.getElementById('wmIntensity')?.value || '3', 10);
        const techniques = resolveTechniques();
        const advanced = resolveAdvanced();
        const quality = resolveQuality();
        let wmReport = null;
        const { blob, log } = await convertImage(currentBytes, currentFile.type, profile, {
            quality, advanced,
            disruptWatermark: disrupt ? async (canvas) => {
                wmReport = await disruptWatermark(canvas, { intensity, techniques });
            } : null,
        });
        if (wmReport) for (const l of wmReport.log) log.push('  · ' + l);

        const url = URL.createObjectURL(blob);
        const origName = currentFile.name.replace(/\.[^.]+$/, '') || 'photo';
        const outName = `${origName}_${profile.Make}_${Date.now().toString(36)}.jpg`;

        resultDiv.innerHTML = `
            <div style="color:var(--success);font-weight:600;margin-bottom:10px">${escHtml(t('conv.done'))}</div>
            <img src="${url}" alt="转换结果">
            <div style="font-size:12px;color:var(--text-muted);margin:8px 0;line-height:1.8">
                ${log.map(l => `• ${escHtml(l)}`).join('<br>')}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <a class="download-btn" href="${url}" download="${escHtml(outName)}">${escHtml(t('conv.download', { size: formatSize(blob.size) }))}</a>
                <button class="btn-secondary" id="btnReanalyze">${escHtml(t('conv.reanalyze'))}</button>
            </div>
        `;
        document.getElementById('btnReanalyze').onclick = async () => {
            const reFile = new File([blob], outName, { type: 'image/jpeg' });
            handleFile(reFile);
        };
        trackConversion();   // bump public conversion counter
    } catch (err) {
        resultDiv.className = 'convert-result error';
        resultDiv.innerHTML = `<div style="color:var(--danger);font-weight:600">${escHtml(t('conv.err', { msg: err.message }))}</div>`;
    } finally {
        btn.disabled = false;
    }
});

// ================= Theme toggle =================
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.dataset.theme;
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem('theme', next);
        const meta = document.querySelector('meta[name="theme-color"]:not([media])');
        if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0a0b' : '#ffffff');
    });
}

// ================= Language toggle =================
const langToggle = document.getElementById('langToggle');
function syncLangToggle() {
    const cur = getLang();
    langToggle?.querySelectorAll('.lang-opt').forEach(el => {
        el.classList.toggle('active', el.dataset.lang === cur);
    });
}
syncLangToggle();
langToggle?.addEventListener('click', (e) => {
    const target = e.target.closest('.lang-opt');
    const next = target ? target.dataset.lang : (getLang() === 'zh' ? 'en' : 'zh');
    if (next === getLang()) return;
    setLang(next);
});
document.addEventListener('langchange', () => {
    syncLangToggle();
    renderCameraSelector();
    renderGpsOptions();
    // Re-render metadata panel if it was rendered
    const mp = document.getElementById('metadataPanel');
    if (mp && mp.innerHTML && currentMeta) {
        renderMetadataPanel(mp, {
            meta: currentMeta, jumbf: currentJumbf,
            file: currentFile, dims: document.getElementById('fileDims').textContent,
        });
    }
});
