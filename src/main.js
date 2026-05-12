// Entry point — wires upload UI, runs detections, renders results.

import { sha256, formatSize, getImageDims, escHtml } from './utils.js';
import { runAllDetections } from './detect.js';
import { CAMERA_PROFILES } from './cameras.js';
import { convertImage } from './convert.js';

let selectedProfile = 'iphone15pro';
let currentFile = null;
let currentBytes = null;

// --- Camera grid ---
const grid = document.getElementById('cameraGrid');
Object.entries(CAMERA_PROFILES).forEach(([key, cam]) => {
    const div = document.createElement('div');
    div.className = 'camera-option' + (key === selectedProfile ? ' selected' : '');
    div.dataset.key = key;
    div.innerHTML = `<div class="icon">${cam.icon}</div><div class="name">${escHtml(cam.displayName)}</div><div class="model">${escHtml(cam.Make)}</div>`;
    div.onclick = () => {
        document.querySelectorAll('.camera-option').forEach(e => e.classList.remove('selected'));
        div.classList.add('selected');
        selectedProfile = key;
    };
    grid.appendChild(div);
});

// --- Upload handling ---
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });

async function handleFile(file) {
    currentFile = file;
    document.getElementById('results').classList.add('hidden');
    uploadArea.innerHTML = '<div class="loading"><div class="spinner"></div><br>正在分析...</div>';

    try {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        currentBytes = uint8;
        const hashHex = await sha256(buffer);

        const fileType = file.type === 'image/png' ? 'PNG (image/png)'
            : file.type === 'image/jpeg' ? 'JPEG (image/jpeg)'
            : file.type === 'image/webp' ? 'WebP (image/webp)' : file.type;

        const { detections } = await runAllDetections(uint8);
        const dims = await getImageDims(file);

        document.getElementById('fileType').textContent = fileType;
        document.getElementById('fileSize').textContent = formatSize(file.size);
        document.getElementById('fileHash').textContent = hashHex;
        document.getElementById('previewImg').src = URL.createObjectURL(file);
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileDims').textContent = dims;

        const aiHits = detections.filter(d => d.hit && d.category !== 'edit');
        const editHits = detections.filter(d => d.hit && d.category === 'edit');
        const anyHit = aiHits.length > 0;
        document.getElementById('headerTitle').textContent = anyHit ? '发现 AI 来源凭证线索' : '未发现明显 AI 来源凭证';
        document.getElementById('headerSubtitle').textContent = anyHit
            ? '这张图可能保留了可验证来源或生成工具相关标记。'
            : editHits.length
                ? '未检出 AI 生成标记,但图片经过修图软件处理。'
                : '当前文件字节中没有检出典型 AI 生成标记。';
        const hb = document.getElementById('headerBadge');
        hb.textContent = anyHit ? '命中' : '未命中';
        hb.className = 'badge ' + (anyHit ? 'badge-hit' : 'badge-clean');

        const container = document.getElementById('detectionItems');
        container.innerHTML = '';
        detections.forEach(d => {
            const div = document.createElement('div');
            div.className = 'detection-item';
            const detailHtml = d.detail
                ? `<details class="detection-item-details"><summary>查看详情</summary><pre class="detection-item-detail">${escHtml(d.detail)}</pre></details>`
                : '';
            const confHtml = d.confidence ? `<span class="conf conf-${d.confidence}">${
                d.confidence === 'strong' ? '强证据' :
                d.confidence === 'medium' ? '中等' :
                d.confidence === 'info' ? '提示' : '弱'
            }</span>` : '';
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

        document.getElementById('convertResult').style.display = 'none';
        document.getElementById('btnConvert').disabled = false;

        uploadArea.innerHTML = `<div class="upload-icon">🔍</div>
            <div class="upload-text">拖拽图片到此处,或 <strong>点击选择文件</strong><br>
            支持 PNG / JPEG / WebP · 检测 C2PA、OpenAI、Google SynthID、Midjourney 等</div>`;
        document.getElementById('results').classList.remove('hidden');
    } catch (err) {
        uploadArea.innerHTML = `<div class="upload-text" style="color:#c0392b">分析出错: ${escHtml(err.message)}</div>`;
    }
}

// --- Convert: strip C2PA + inject camera EXIF (task #7) ---
document.getElementById('btnConvert').addEventListener('click', async () => {
    if (!currentFile || !currentBytes) return;
    const btn = document.getElementById('btnConvert');
    const resultDiv = document.getElementById('convertResult');
    resultDiv.style.display = 'block';
    resultDiv.className = 'convert-result';
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><br>正在处理...</div>';
    btn.disabled = true;

    try {
        const profile = CAMERA_PROFILES[selectedProfile];
        const disrupt = document.getElementById('chkDisruptWatermark')?.checked;
        const { blob, log } = await convertImage(currentBytes, currentFile.type, profile, {
            quality: 0.92,
            // disruptWatermark: disrupt ? (canvas) => applyDisruption(canvas) : null,  // task #8
        });
        if (disrupt) log.push('⚠️ 水印扰动功能将在下一版本(任务 #8)启用');

        const url = URL.createObjectURL(blob);
        const origName = currentFile.name.replace(/\.[^.]+$/, '') || 'photo';
        const outName = `${origName}_${profile.Make}_${Date.now().toString(36)}.jpg`;

        resultDiv.innerHTML = `
            <div style="color:#2e7d32;font-weight:600;margin-bottom:10px">✅ 转换完成</div>
            <img src="${url}" alt="转换结果">
            <div style="font-size:12px;color:#666;margin:8px 0;line-height:1.8">
                ${log.map(l => `• ${escHtml(l)}`).join('<br>')}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                <a class="download-btn" href="${url}" download="${escHtml(outName)}">⬇️ 下载 (${formatSize(blob.size)})</a>
                <button class="download-btn" style="background:#555;border:none;cursor:pointer" id="btnReanalyze">🔍 重新分析</button>
            </div>
        `;
        document.getElementById('btnReanalyze').onclick = async () => {
            const reFile = new File([blob], outName, { type: 'image/jpeg' });
            handleFile(reFile);
        };
    } catch (err) {
        resultDiv.className = 'convert-result error';
        resultDiv.innerHTML = `<div style="color:#c0392b;font-weight:600">转换失败: ${escHtml(err.message)}</div>`;
    } finally {
        btn.disabled = false;
    }
});
