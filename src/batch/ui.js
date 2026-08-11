import { analyzeImage } from '../analyzer.js';
import { CAMERA_PROFILES, CAMERA_GROUPS, GPS_PRESETS } from '../cameras.js';
import { PRESETS } from '../watermark.js';
import { escHtml, formatSize, resolveImageMime } from '../utils.js';
import { t } from '../i18n.js';
import { convertFile } from './converter.js';
import { runBatchQueue } from './queue.js';
import { serializeBatchCsv, serializeBatchJson } from './report.js';
import { createConversionZip } from './zip.js';

const TERMINAL = new Set(['completed', 'failed', 'canceled']);
const MAX_BATCH_ITEMS = 200;
const MAX_BATCH_CONVERSIONS = 50;

function numberValue(id) {
    const value = Number(document.getElementById(id)?.value);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function icon(name) {
    if (name === 'retry') {
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6v6h-6"/><path d="M20 12a8 8 0 1 0-2.34 5.66"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>';
}

export function initBatchUi(options = {}) {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const emptyState = document.getElementById('emptyState');
    const resultView = document.getElementById('resultView');
    const previewBlock = document.getElementById('previewBlock');
    const batchView = document.getElementById('batchView');
    const rows = document.getElementById('batchRows');
    const detectModeControl = document.getElementById('batchDetectMode');
    const convertSettings = document.getElementById('batchConvertSettings');
    const message = document.getElementById('batchMessage');

    let appMode = 'single';
    let operation = 'detect';
    let detectMode = 'quick';
    let records = [];
    let sequence = 0;
    let running = false;
    let controller = null;
    let singleState = null;

    function snapshotSingleState() {
        return {
            empty: !emptyState.classList.contains('hidden'),
            result: !resultView.classList.contains('hidden'),
            preview: !previewBlock.classList.contains('hidden'),
            upload: !uploadArea.classList.contains('hidden'),
        };
    }

    function restoreSingleState() {
        const state = singleState || { empty: true, result: false, preview: false, upload: true };
        emptyState.classList.toggle('hidden', !state.empty);
        resultView.classList.toggle('hidden', !state.result);
        previewBlock.classList.toggle('hidden', !state.preview);
        uploadArea.classList.toggle('hidden', !state.upload);
    }

    function setAppMode(next) {
        if (next !== 'single' && next !== 'batch') return;
        if (next === appMode) return;
        if (next === 'batch') {
            singleState = snapshotSingleState();
            emptyState.classList.add('hidden');
            resultView.classList.add('hidden');
            previewBlock.classList.add('hidden');
            uploadArea.classList.remove('hidden');
            batchView.classList.remove('hidden');
        } else {
            batchView.classList.add('hidden');
            restoreSingleState();
        }
        appMode = next;
        document.querySelectorAll('[data-app-mode]').forEach(button => {
            const active = button.dataset.appMode === next;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
    }

    function populateDynamicSelects() {
        const camera = document.getElementById('batchCamera');
        const cameraValue = camera.value || 'iphone17promax';
        camera.innerHTML = '';
        for (const group of CAMERA_GROUPS) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = t(`conv.group.${group.id}`);
            for (const [key, profile] of Object.entries(CAMERA_PROFILES)) {
                if (profile.group !== group.id) continue;
                const option = document.createElement('option');
                option.value = key;
                option.textContent = `${profile.displayName} - ${profile.Make}`;
                optgroup.appendChild(option);
            }
            camera.appendChild(optgroup);
        }
        camera.value = CAMERA_PROFILES[cameraValue] ? cameraValue : 'iphone17promax';

        const gps = document.getElementById('batchGps');
        const gpsValue = gps.value || 'none';
        gps.innerHTML = '';
        for (const key of Object.keys(GPS_PRESETS)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = t(`gps.${key}`);
            gps.appendChild(option);
        }
        gps.value = GPS_PRESETS[gpsValue] ? gpsValue : 'none';
    }

    function readAdvanced() {
        const datePreset = document.getElementById('batchDate').value;
        const offsets = { '-1d': 864e5, '-7d': 7 * 864e5, '-30d': 30 * 864e5 };
        const advanced = { dateTime: new Date(Date.now() - (offsets[datePreset] || 0)) };
        const gps = GPS_PRESETS[document.getElementById('batchGps').value];
        if (gps?.lat != null) advanced.gps = { lat: gps.lat, lon: gps.lon };
        const iso = numberValue('batchIso');
        const fNumber = numberValue('batchFNumber');
        const shutter = numberValue('batchShutter');
        if (iso) advanced.iso = Math.round(iso);
        if (fNumber) advanced.fNumber = fNumber;
        if (shutter) advanced.exposureTime = [1, Math.round(shutter)];
        return advanced;
    }

    function readConversionOptions(id) {
        const profileKey = document.getElementById('batchCamera').value;
        const preset = document.getElementById('batchPreset').value;
        const qualityValue = document.getElementById('batchQuality').value;
        const disrupt = document.getElementById('batchDisrupt').checked;
        return {
            profileKey,
            profile: CAMERA_PROFILES[profileKey],
            quality: qualityValue === 'random' ? 0.88 + Math.random() * 0.07 : Number(qualityValue),
            advanced: readAdvanced(),
            disrupt,
            intensity: Math.max(1, Math.min(5, numberValue('batchIntensity') || 3)),
            techniques: disrupt ? [...(PRESETS[preset]?.techniques || [])] : [],
            suffix: `b${id}`,
        };
    }

    function setOperation(next) {
        if (running || (next !== 'detect' && next !== 'convert')) return;
        operation = next;
        document.querySelectorAll('[data-batch-operation]').forEach(button => {
            const active = button.dataset.batchOperation === next;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
        detectModeControl.classList.toggle('hidden', next !== 'detect');
        convertSettings.classList.toggle('hidden', next !== 'convert');
    }

    function setDetectMode(next) {
        if (running || (next !== 'quick' && next !== 'full')) return;
        detectMode = next;
        document.querySelectorAll('[data-batch-detect-mode]').forEach(button => {
            const active = button.dataset.batchDetectMode === next;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
    }

    function stageLabel(progress) {
        if (!progress?.stage) return '';
        const stage = progress.stage.replace('frequency.', '');
        const key = `batch.stage.${stage}`;
        const translated = t(key);
        return translated === key ? stage : translated;
    }

    function verdictLabel(kind) {
        const key = `batch.verdict.${kind || 'none'}`;
        const translated = t(key);
        return translated === key ? kind : translated;
    }

    function statusLabel(status) {
        return t(`batch.status.${status}`);
    }

    function errorLabel(error) {
        const text = error?.message || String(error || '');
        if (/Unsupported image type/i.test(text)) return t('batch.error.type');
        return text;
    }

    function taskLabel(record) {
        if (record.operation === 'convert') {
            return `${t('batch.operation.convert')} · ${escHtml(record.options.profile.displayName)}`;
        }
        return `${t('batch.operation.detect')} · ${t(`batch.mode.${record.mode}`)}`;
    }

    function resultLabel(record) {
        if (record.status === 'failed') return `<span class="batch-error">${escHtml(errorLabel(record.error))}</span>`;
        if (record.status === 'canceled') return '<span class="batch-muted">-</span>';
        if (record.status !== 'completed') return '<span class="batch-muted">-</span>';
        if (record.operation === 'convert') {
            const conversion = record.result.conversion;
            return `<span class="batch-result-main">${escHtml(conversion.outputName)}</span><span class="batch-result-sub">${formatSize(conversion.outputSize)}</span>`;
        }
        const report = record.result.report;
        const c2pa = report.c2pa.verified ? ` · C2PA ${report.c2pa.state || report.c2pa.status}` : '';
        const score = report.frequency?.applicable && report.frequency.score != null
            ? ` · ${t('batch.score', { score: report.frequency.score })}` : '';
        return `<span class="batch-result-main">${escHtml(verdictLabel(report.verdict))}</span><span class="batch-result-sub">${escHtml(c2pa + score)}</span>`;
    }

    function rowActions(record) {
        const actions = [];
        if (record.status === 'failed' || record.status === 'canceled') {
            actions.push(`<button class="batch-icon-btn" type="button" data-batch-retry="${record.id}" title="${escHtml(t('batch.retry'))}" aria-label="${escHtml(t('batch.retry'))}">${icon('retry')}</button>`);
        }
        if (record.status === 'completed' && record.operation === 'convert') {
            actions.push(`<button class="batch-icon-btn" type="button" data-batch-download="${record.id}" title="${escHtml(t('batch.download'))}" aria-label="${escHtml(t('batch.download'))}">${icon('download')}</button>`);
        }
        return actions.join('');
    }

    function render() {
        const total = records.length;
        const done = records.filter(record => TERMINAL.has(record.status)).length;
        const completedConversions = records.filter(record => record.status === 'completed' && record.operation === 'convert');
        document.getElementById('batchSummary').textContent = t('batch.summary', { done, total });
        document.getElementById('batchProgressBar').style.width = total ? `${done / total * 100}%` : '0%';
        document.getElementById('batchEmpty').classList.toggle('hidden', total > 0);
        document.getElementById('batchTableWrap').classList.toggle('hidden', total === 0);
        document.getElementById('btnBatchCancel').disabled = !running;
        document.getElementById('btnBatchClear').disabled = !records.some(record => TERMINAL.has(record.status));
        document.getElementById('btnBatchCsv').disabled = total === 0;
        document.getElementById('btnBatchJson').disabled = total === 0;
        document.getElementById('btnBatchZip').disabled = completedConversions.length === 0;
        document.querySelectorAll('.batch-lock-while-running').forEach(element => { element.disabled = running; });

        rows.innerHTML = records.map(record => {
            const progress = record.status === 'running'
                ? `<span class="batch-stage">${escHtml(stageLabel(record.progress))}${record.progress?.pct != null ? ` ${record.progress.pct}%` : ''}</span>` : '';
            return `<tr data-batch-id="${record.id}">
                <td><span class="batch-file-name" title="${escHtml(record.file.name)}">${escHtml(record.file.name)}</span><span class="batch-file-size">${formatSize(record.file.size)}</span></td>
                <td>${taskLabel(record)}</td>
                <td><span class="batch-status status-${record.status}">${escHtml(statusLabel(record.status))}</span>${progress}</td>
                <td>${resultLabel(record)}</td>
                <td><div class="batch-row-actions">${rowActions(record)}</div></td>
            </tr>`;
        }).join('');
    }

    function showMessage(text, tone = 'error') {
        message.textContent = text;
        message.className = `batch-message ${tone}`;
    }

    function clearMessage() {
        message.textContent = '';
        message.className = 'batch-message hidden';
    }

    async function processRecord(record, _index, signal) {
        const onProgress = progress => {
            record.progress = progress;
            render();
        };
        if (record.operation === 'convert') {
            return convertFile(record.file, { ...record.options, signal, onProgress });
        }
        return analyzeImage(record.file, { mode: record.mode, signal, onProgress });
    }

    async function pump() {
        if (running) return;
        const pending = records.filter(record => record.status === 'queued');
        if (!pending.length) return;
        running = true;
        controller = new AbortController();
        clearMessage();
        render();
        const concurrency = pending.some(record => record.operation === 'convert' || record.mode === 'full') ? 1 : 2;
        let completedAnalyses = 0;
        let completedConversions = 0;

        await runBatchQueue(pending, processRecord, {
            concurrency,
            signal: controller.signal,
            onUpdate: state => {
                const record = state.item;
                record.status = state.status;
                record.error = state.error;
                if (state.result) record.result = state.result;
                if (state.status === 'completed') {
                    if (record.operation === 'convert') completedConversions++;
                    else completedAnalyses++;
                }
                render();
            },
        });

        if (completedAnalyses) options.onAnalysisComplete?.(completedAnalyses);
        if (completedConversions) options.onConversionComplete?.(completedConversions);

        running = false;
        controller = null;
        render();
        if (records.some(record => record.status === 'queued')) pump();
    }

    function addFiles(fileList) {
        let files = Array.from(fileList || []);
        if (!files.length) return;
        if (files.length > 1 && appMode !== 'batch') setAppMode('batch');
        if (appMode === 'single') {
            singleState = null;
            options.onSingleFile?.(files[0]);
            return;
        }

        const totalSlots = Math.max(0, MAX_BATCH_ITEMS - records.length);
        const conversionCount = records.filter(record => record.operation === 'convert').length;
        const operationSlots = operation === 'convert'
            ? Math.max(0, MAX_BATCH_CONVERSIONS - conversionCount)
            : totalSlots;
        const acceptedCount = Math.min(files.length, totalSlots, operationSlots);
        if (acceptedCount < files.length) {
            const limit = operation === 'convert' ? MAX_BATCH_CONVERSIONS : MAX_BATCH_ITEMS;
            showMessage(t('batch.error.limit', { limit }));
        } else {
            clearMessage();
        }
        files = files.slice(0, acceptedCount);

        for (const file of files) {
            const id = ++sequence;
            const supported = Boolean(resolveImageMime(file));
            records.push({
                id,
                file,
                operation,
                mode: operation === 'detect' ? detectMode : 'convert',
                options: operation === 'convert' ? readConversionOptions(id) : null,
                status: supported ? 'queued' : 'failed',
                progress: null,
                result: null,
                error: supported ? null : new TypeError(t('batch.error.type')),
            });
        }
        render();
        pump();
    }

    function cancel() {
        controller?.abort();
        for (const record of records) {
            if (record.status === 'queued') record.status = 'canceled';
        }
        render();
    }

    function clearFinished() {
        records = records.filter(record => !TERMINAL.has(record.status));
        clearMessage();
        render();
    }

    function retry(id) {
        const record = records.find(item => item.id === id);
        if (!record || !TERMINAL.has(record.status)) return;
        record.status = 'queued';
        record.error = null;
        record.result = null;
        record.progress = null;
        render();
        pump();
    }

    function exportText(kind) {
        const text = kind === 'csv' ? serializeBatchCsv(records) : serializeBatchJson(records);
        const mime = kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
        downloadBlob(new Blob([text], { type: mime }), `image-provenance-${Date.now()}.${kind}`);
    }

    async function downloadZip() {
        const completed = records.filter(record => record.status === 'completed' && record.operation === 'convert');
        if (!completed.length) return;
        const button = document.getElementById('btnBatchZip');
        button.disabled = true;
        clearMessage();
        try {
            const manifest = JSON.parse(serializeBatchJson(completed));
            const zip = await createConversionZip(completed.map(record => ({
                name: record.result.conversion.outputName,
                blob: record.result.blob,
            })), manifest);
            downloadBlob(zip, `image-provenance-converted-${Date.now()}.zip`);
        } catch (error) {
            showMessage(t('batch.error.zip', { msg: error?.message || String(error) }));
        } finally {
            render();
        }
    }

    uploadArea.addEventListener('click', event => {
        if (event.target.closest('input, button, a')) return;
        fileInput.click();
    });
    uploadArea.addEventListener('dragover', event => {
        event.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', event => {
        event.preventDefault();
        uploadArea.classList.remove('dragover');
        addFiles(event.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => {
        addFiles(fileInput.files);
        fileInput.value = '';
    });

    document.getElementById('appModeSwitch').addEventListener('click', event => {
        const button = event.target.closest('[data-app-mode]');
        if (button) setAppMode(button.dataset.appMode);
    });
    document.getElementById('batchOperation').addEventListener('click', event => {
        const button = event.target.closest('[data-batch-operation]');
        if (button) setOperation(button.dataset.batchOperation);
    });
    detectModeControl.addEventListener('click', event => {
        const button = event.target.closest('[data-batch-detect-mode]');
        if (button) setDetectMode(button.dataset.batchDetectMode);
    });
    document.getElementById('btnBatchAdd').addEventListener('click', () => fileInput.click());
    document.getElementById('btnBatchCancel').addEventListener('click', cancel);
    document.getElementById('btnBatchClear').addEventListener('click', clearFinished);
    document.getElementById('btnBatchCsv').addEventListener('click', () => exportText('csv'));
    document.getElementById('btnBatchJson').addEventListener('click', () => exportText('json'));
    document.getElementById('btnBatchZip').addEventListener('click', downloadZip);
    rows.addEventListener('click', event => {
        const retryButton = event.target.closest('[data-batch-retry]');
        if (retryButton) retry(Number(retryButton.dataset.batchRetry));
        const downloadButton = event.target.closest('[data-batch-download]');
        if (downloadButton) {
            const record = records.find(item => item.id === Number(downloadButton.dataset.batchDownload));
            if (record?.result?.blob) downloadBlob(record.result.blob, record.result.conversion.outputName);
        }
    });

    document.addEventListener('langchange', () => {
        populateDynamicSelects();
        render();
    });

    populateDynamicSelects();
    render();
    return { addFiles, setAppMode, getRecords: () => [...records] };
}
