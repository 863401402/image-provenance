// Byte-level watermark heuristics (LSB bias, byte-frequency, correlation breaks).
// Ported from index.html detectWatermarkFFT(). This is NOT real FFT — it's a
// cheap byte-stream heuristic. True frequency-domain analysis lives in
// src/frequency/ and runs on decoded pixel data inside a Web Worker.

export function detectWatermarkFFT(uint8) {
    // --- LSB bias ---
    const lsb0 = { r: 0, g: 0, b: 0 };
    const lsb1 = { r: 0, g: 0, b: 0 };
    let sampleCount = 0;
    const maxSample = 200000;
    const step = Math.max(4, Math.floor(uint8.length / maxSample));
    for (let i = 1000; i < uint8.length - 2 && sampleCount < maxSample; i += step) {
        const r = uint8[i], g = uint8[i+1] || 0, b = uint8[i+2] || 0;
        lsb0.r += r & 1; lsb0.g += g & 1; lsb0.b += b & 1;
        lsb1.r += (r >> 1) & 1; lsb1.g += (g >> 1) & 1; lsb1.b += (b >> 1) & 1;
        sampleCount++;
    }
    const total = sampleCount * 3;
    const lsb0Ratio = (lsb0.r + lsb0.g + lsb0.b) / total;
    const lsb1Ratio = (lsb1.r + lsb1.g + lsb1.b) / total;
    const lsbBias = Math.abs(lsb0Ratio - 0.5);
    const lsb1Bias = Math.abs(lsb1Ratio - 0.5);

    // --- Byte histogram chi-square ---
    const byteHist = new Uint32Array(256);
    let byteCount = 0;
    for (let i = 500; i < uint8.length; i += 3) {
        byteHist[uint8[i]]++;
        byteCount++;
    }
    const expectedFreq = byteCount / 256;
    let chiSquare = 0;
    for (let i = 0; i < 256; i++) {
        const diff = byteHist[i] - expectedFreq;
        chiSquare += (diff * diff) / expectedFreq;
    }
    // eslint-disable-next-line no-unused-vars
    const chiNorm = Math.min(chiSquare / (byteCount * 0.01), 100);

    // --- High-frequency adjacency ---
    let highFreqEnergy = 0, totalVariance = 0;
    let prevVal = uint8[1000];
    const corrSample = Math.min(100000, uint8.length - 1001);
    for (let i = 1001; i < 1001 + corrSample; i++) {
        const diff = uint8[i] - prevVal;
        highFreqEnergy += diff * diff;
        totalVariance += uint8[i] * uint8[i];
        prevVal = uint8[i];
    }
    const highFreqRatio = Math.sqrt(highFreqEnergy) / Math.sqrt(totalVariance + 1);

    // --- Adjacent low-bit correlation break ---
    let corrBreaks = 0;
    const corrStep = Math.max(4, Math.floor(corrSample / 50000));
    for (let i = 1000; i < uint8.length - 4 && corrBreaks < 50000; i += corrStep) {
        const a = uint8[i] & 0x03;
        const b = uint8[i+4] & 0x03;
        if (Math.abs(a - b) > 1) corrBreaks++;
    }
    const corrBreakRatio = corrBreaks / (corrSample / corrStep);

    // --- Mid-frequency periodic peak ---
    let midFreqPeaks = 0;
    const windowSize = 64;
    for (let offset = 0; offset < windowSize; offset++) {
        let energy = 0;
        for (let i = 1000 + offset; i < uint8.length - windowSize; i += windowSize) {
            energy += uint8[i];
        }
        const avgEnergy = energy / ((uint8.length - 1000) / windowSize);
        if (avgEnergy > 120 && avgEnergy < 136) midFreqPeaks++;
    }

    // --- Scoring ---
    let score = 0;
    if (lsbBias > 0.03) score += 30;
    else if (lsbBias > 0.02) score += 20;
    else if (lsbBias > 0.01) score += 10;
    if (highFreqRatio > 0.15) score += 20;
    else if (highFreqRatio > 0.10) score += 10;
    if (corrBreakRatio > 0.6) score += 20;
    else if (corrBreakRatio > 0.4) score += 10;
    if (midFreqPeaks > 10) score += 20;
    else if (midFreqPeaks > 5) score += 10;
    if (lsb1Bias > 0.02) score += 10;
    score = Math.min(100, score);

    return {
        suspicious: score >= 40,
        score,
        highFreqRatio,
        midFreqPeaks,
        lsbBias,
    };
}
