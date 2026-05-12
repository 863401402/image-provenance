// Entry point — wires upload UI, runs detections, renders results.
// The convert/watermark-disrupt pipeline is a stub for now (task #7/#8 will fill it in).

import { sha256, formatSize, getImageDims, escHtml } from './utils.js';
import { runAllDetections } from './detect.js';

const CAMERA_PROFILES = {
    iphone15pro: { icon: '📱', name: 'iPhone 15 Pro Max', model: 'Apple' },
    canonr5: { icon: '📷', name: 'Canon EOS R5', model: 'Canon' },
    sonya7iv: { icon: '📷', name: 'Sony A7 IV', model: 'SONY' },
    samsungs24: { icon: '📱', name: 'Galaxy S24+', model: 'Samsung' },
    xiaomi15: { icon: '📱', name: '小米15 Pro', model: 'Xiaomi' },
};

let selectedProfile = 'iphone15pro';
let currentFile = null;

// --- Camera grid ---
const grid = document.getElementById('cameraGrid');
Object.entries(CAMERA_PROFILES).forEach(([key, cam]) => {
    const div = document.createElement('div');
    div.className = 'camera-option' + (key === selectedProfile ? ' selected' : '');
    div.dataset.key = key;
    div.innerHTML = `<div class="icon">${cam.icon}</div><div class="name">${escHtml(cam.name)}</div><div class="model">${escHtml(cam.model)}</div>`;
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

        const anyHit = detections.some(d => d.hit);
        document.getElementById('headerTitle').textContent = anyHit ? '发现 AI 来源凭证线索' : '未发现明显来源凭证';
        document.getElementById('headerSubtitle').textContent = anyHit
            ? '这张图可能保留了可验证来源或生成工具相关标记。'
            : '当前文件字节中没有检出典型 AI 生成标记。';
        const hb = document.getElementById('headerBadge');
        hb.textContent = anyHit ? '命中' : '未命中';
        hb.className = 'badge ' + (anyHit ? 'badge-hit' : 'badge-clean');

        const container = document.getElementById('detectionItems');
        container.innerHTML = '';
        detections.forEach(d => {
            const div = document.createElement('div');
            div.className = 'detection-item';
            const detailHtml = d.detail ? `<div class="detection-item-detail">${escHtml(d.detail)}</div>` : '';
            const confHtml = d.confidence ? `<span class="conf conf-${d.confidence}">${
                d.confidence === 'strong' ? '强证据' : d.confidence === 'medium' ? '中等' : '弱'
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

// --- Convert stub (real pipeline lands in tasks #7/#8) ---
document.getElementById('btnConvert').addEventListener('click', () => {
    const resultDiv = document.getElementById('convertResult');
    resultDiv.className = 'convert-result';
    resultDiv.innerHTML = `
        <div style="color:#1565c0;font-weight:600;margin-bottom:8px">
            🚧 转换功能正在重构为纯前端实现(任务 #7/#8)
        </div>
        <div style="font-size:13px;color:#666;line-height:1.6">
            本站点已移除后端依赖。C2PA 剥离 + EXIF 注入 + 水印干扰的纯 Canvas 版本正在开发中,
            将在下一版本启用。当前版本仅提供检测功能。
        </div>
    `;
    resultDiv.style.display = 'block';
});

// Expose for legacy inline handlers (harmless after full cleanup)
window.currentFile = () => currentFile;
window.selectedProfile = () => selectedProfile;
