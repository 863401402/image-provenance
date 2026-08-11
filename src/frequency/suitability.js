export function assessPixelSuitability(rgba, gray, width, height) {
    const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 65536)));
    const histogram = new Uint32Array(32);
    let count = 0, sum = 0, sumSq = 0, nearBinary = 0;
    let pairs = 0, flatPairs = 0, edgePairs = 0;

    for (let y = 0; y < height; y += stride) {
        for (let x = 0; x < width; x += stride) {
            const i = y * width + x;
            const value = gray[i];
            count++;
            sum += value;
            sumSq += value * value;
            histogram[Math.min(31, Math.floor(value / 8))]++;
            if (value <= 32 || value >= 223) nearBinary++;

            if (x >= stride) {
                const diff = Math.abs(value - gray[i - stride]);
                pairs++;
                if (diff <= 2) flatPairs++;
                if (diff >= 48) edgePairs++;
            }
            if (y >= stride) {
                const diff = Math.abs(value - gray[i - stride * width]);
                pairs++;
                if (diff <= 2) flatPairs++;
                if (diff >= 48) edgePairs++;
            }
        }
    }

    const mean = count ? sum / count : 0;
    const stdDev = Math.sqrt(Math.max(0, count ? sumSq / count - mean * mean : 0));
    let entropy = 0;
    for (const bin of histogram) {
        if (!bin) continue;
        const p = bin / count;
        entropy -= p * Math.log2(p);
    }
    entropy /= Math.log2(histogram.length);

    const metrics = {
        stdDev,
        entropy,
        nearBinaryRatio: count ? nearBinary / count : 0,
        flatPairRatio: pairs ? flatPairs / pairs : 0,
        edgeDensity: pairs ? edgePairs / pairs : 0,
    };
    const reasons = [];

    if (metrics.nearBinaryRatio >= 0.72 && metrics.edgeDensity >= 0.025 && metrics.entropy <= 0.48) {
        reasons.push('qrOrDocument');
    } else if (metrics.stdDev < 10 || (metrics.edgeDensity < 0.002 && metrics.entropy < 0.35)) {
        reasons.push('lowTexture');
    } else if (metrics.flatPairRatio >= 0.72 && metrics.edgeDensity >= 0.008 && metrics.entropy < 0.68) {
        reasons.push('graphicOrScreenshot');
    }

    return { suitable: reasons.length === 0, reasons, metrics };
}
