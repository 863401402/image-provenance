// Frequency-tab rendering — FFT heatmap, radial curve, feature table, verdict.

import { t } from '../i18n.js';

function verdictText(score) {
    if (score.total >= 6) return t('freq.verdict.highAI');
    if (score.total >= 3) return t('freq.verdict.hasAI');
    if (score.total >= 1) return t('freq.verdict.weak');
    if (score.total <= -1) return t('freq.verdict.real');
    return t('freq.verdict.unsure');
}

export function renderFrequencyPanel(container, result) {
    const { features, viz, score, timing, side } = result;
    if (result.suitability?.suitable === false) {
        const reasons = result.suitability.reasons
            .map(reason => t(`freq.unsuitable.reason.${reason}`));
        const metrics = result.suitability.metrics || {};
        const metricText = Object.keys(metrics).length ? `
            <details class="freq-features">
                <summary>${escHtml(t('freq.unsuitable.metrics'))}</summary>
                <table class="freq-table">
                    ${Object.entries(metrics).map(([key, value]) => `
                        <tr><td>${escHtml(key)}</td><td>${Number(value).toFixed(4)}</td></tr>`).join('')}
                </table>
            </details>` : '';
        container.innerHTML = `
            <div class="freq-disclaimer">
                <span class="freq-disclaimer-tag">${escHtml(t('freq.disclaimer.tag'))}</span>
                <span>${escHtml(t('freq.disclaimer.text'))}</span>
            </div>
            <div class="freq-unsuitable">
                <h3>${escHtml(t('freq.unsuitable.title'))}</h3>
                <p>${escHtml(t('freq.unsuitable.text'))}</p>
                <ul>${reasons.map(reason => `<li>${escHtml(reason)}</li>`).join('')}</ul>
            </div>
            ${metricText}`;
        return;
    }
    container.innerHTML = `
        <div class="freq-disclaimer">
            <span class="freq-disclaimer-tag">${escHtml(t('freq.disclaimer.tag'))}</span>
            <span>${escHtml(t('freq.disclaimer.text'))}</span>
        </div>
        <div class="freq-head">
            <div class="freq-verdict ${score.confidence ? 'conf-' + score.confidence : ''}">
                <span class="freq-verdict-label">${escHtml(t('freq.verdict.label'))}</span>
                <span class="freq-verdict-value">${escHtml(verdictText(score))}</span>
                <span class="freq-score">${escHtml(t('freq.score', { total: score.total, pos: score.positive, neg: score.negative }))}</span>
            </div>
            <div class="freq-timing">${escHtml(t('freq.timing', { side, ms: Math.round(timing.features + timing.score) }))}</div>
        </div>
        <div class="freq-viz">
            <div class="freq-viz-box">
                <div class="freq-viz-title">${escHtml(t('freq.viz.fft'))}</div>
                <canvas id="fftCanvas" width="256" height="256"></canvas>
                <div class="freq-viz-hint">${escHtml(t('freq.viz.fftHint'))}</div>
            </div>
            <div class="freq-viz-box">
                <div class="freq-viz-title">${escHtml(t('freq.viz.radial'))}</div>
                <canvas id="radialCanvas" width="320" height="160"></canvas>
                <div class="freq-viz-hint">${escHtml(t('freq.viz.radialHint'))}</div>
            </div>
        </div>
        <div class="freq-votes">
            <div class="freq-subtitle">${escHtml(t('freq.votes.title', { n: score.votes.length }))}</div>
            ${score.votes.length === 0
                ? `<div class="freq-empty">${escHtml(t('freq.votes.empty'))}</div>`
                : score.votes.map(v => `
                    <div class="freq-vote ${v.weight > 0 ? 'vote-pos' : 'vote-neg'}">
                        <span class="vote-weight">${v.weight > 0 ? '+' : ''}${v.weight}</span>
                        <span class="vote-reason">${escHtml(v.reason)}</span>
                    </div>
                `).join('')}
        </div>
        <details class="freq-features">
            <summary>${escHtml(t('freq.features.summary', { n: Object.keys(features).length }))}</summary>
            <table class="freq-table">
                ${Object.entries(features).map(([k, v]) => `
                    <tr><td>${escHtml(k)}</td><td>${typeof v === 'number' ? v.toFixed(4) : v}</td></tr>
                `).join('')}
            </table>
        </details>
    `;
    drawFftHeatmap(container.querySelector('#fftCanvas'), viz.fftMag128);
    drawRadialCurve(container.querySelector('#radialCanvas'), viz.radial64);
}

function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

function drawFftHeatmap(canvas, mag128) {
    const ctx = canvas.getContext('2d');
    const N = 128, dst = canvas.width;
    // log-scale and normalize
    const logVals = new Float32Array(mag128.length);
    let maxV = 0;
    for (let i = 0; i < mag128.length; i++) { logVals[i] = Math.log(1 + mag128[i]); if (logVals[i] > maxV) maxV = logVals[i]; }
    const img = ctx.createImageData(dst, dst);
    const scale = dst / N;
    for (let y = 0; y < dst; y++) {
        for (let x = 0; x < dst; x++) {
            const sx = Math.floor(x / scale), sy = Math.floor(y / scale);
            const v = maxV > 0 ? logVals[sy * N + sx] / maxV : 0;
            const [r, g, b] = viridis(v);
            const i = (y * dst + x) * 4;
            img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
}

function drawRadialCurve(canvas, radial) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const styles = getComputedStyle(document.documentElement);
    const bg = styles.getPropertyValue('--surface-alt').trim() || '#fafafa';
    const grid = styles.getPropertyValue('--border').trim() || '#e0e0e0';
    const curve = styles.getPropertyValue('--text').trim() || '#0a0a0b';
    const label = styles.getPropertyValue('--text-muted').trim() || '#666';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const N = radial.length;
    const pad = 28;
    const logR = Array.from(radial, v => Math.log(Math.max(v, 1e-6)));
    let lo = Infinity, hi = -Infinity;
    for (let i = 1; i < N; i++) { if (logR[i] < lo) lo = logR[i]; if (logR[i] > hi) hi = logR[i]; }
    const span = hi - lo || 1;
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
        const y = pad + (h - 2*pad) * (k / 4);
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }
    ctx.strokeStyle = curve; ctx.lineWidth = 1.75; ctx.beginPath();
    for (let i = 1; i < N; i++) {
        const px = pad + (w - 2*pad) * (i - 1) / (N - 2);
        const py = (h - pad) - (h - 2*pad) * (logR[i] - lo) / span;
        if (i === 1) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = label; ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(t('freq.axis.low'), pad - 4, h - 8);
    ctx.fillText(t('freq.axis.high'), w - pad - 20, h - 8);
    ctx.fillText('log(power)', 2, 12);
}

function viridis(t) {
    // Simple viridis approximation (5-stop gradient)
    t = Math.max(0, Math.min(1, t));
    const stops = [
        [68, 1, 84], [59, 82, 139], [33, 144, 141], [93, 201, 99], [253, 231, 37],
    ];
    const s = t * (stops.length - 1);
    const i = Math.floor(s), f = s - i;
    if (i >= stops.length - 1) return stops[stops.length - 1];
    const [r0,g0,b0] = stops[i], [r1,g1,b1] = stops[i+1];
    return [r0 + (r1-r0)*f, g0 + (g1-g0)*f, b0 + (b1-b0)*f];
}
