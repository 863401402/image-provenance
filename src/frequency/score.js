// Heuristic scoring over the extracted feature set.
// Deliberately NOT a trained classifier — see README for rationale.
// Each rule casts a vote with weight + reason; the UI aggregates them.

export function scoreFeatures(f) {
    const votes = [];
    const push = (weight, reason, value, family) => votes.push({ weight, reason, value, family });

    // --- Spectral shape ---
    // Real photos roughly follow a 1/f slope (≈ -1.5 to -2.5 on log-log).
    // Slopes much shallower than that are suspicious (AI tends toward flatter spectra).
    if (f.f04_spectral_slope > -0.8) push(+2, `频谱衰减偏平缓 (slope=${f.f04_spectral_slope.toFixed(2)})`, f.f04_spectral_slope, 'spectral');
    else if (f.f04_spectral_slope < -2.8) push(-1, `频谱衰减过陡,像强压缩照片 (slope=${f.f04_spectral_slope.toFixed(2)})`, f.f04_spectral_slope, 'spectral');

    if (f.f05_spectral_flatness > 0.35) push(+2, `频谱平坦度高,能量分布均匀 (flatness=${f.f05_spectral_flatness.toFixed(3)})`, f.f05_spectral_flatness, 'spectral');

    // Fourier magnitudes of all real-valued images are centrosymmetric because
    // of conjugate symmetry. f18 is retained as a transform sanity check only.

    // --- Angular anisotropy: real photos have texture directions ---
    if (f.f21_orientation_strength < 1.3) push(+1, `方向性弱,无明显纹理方向 (str=${f.f21_orientation_strength.toFixed(2)})`, f.f21_orientation_strength, 'angular');

    // --- Generic phase anomalies ---
    const pMax = Math.max(f.f22_phase_consistency_r, f.f23_phase_consistency_g, f.f24_phase_consistency_b);
    if (pMax > 0.12) push(+2, `通道相位结构异常 (max=${pMax.toFixed(3)})`, pMax, 'phase');
    if (Math.abs(f.f26_cross_color_phase_corr) > 0.15) push(+1, `跨通道相位相关性异常 (${f.f26_cross_color_phase_corr.toFixed(3)})`, f.f26_cross_color_phase_corr, 'phase');

    // --- LSB bias: watermark or steganography ---
    const lsbMax = Math.max(f.f27_lsb0_bias_r, f.f28_lsb0_bias_g, f.f29_lsb0_bias_b);
    if (lsbMax > 0.04) push(+1, `LSB 分布偏离均衡 (${lsbMax.toFixed(3)})`, lsbMax, 'lsb');

    // --- Pixel statistics ---
    // AI-generated images sometimes have flatter distributions (lower kurt, lower skew abs)
    const avgKurt = (Math.abs(f.f36_pixel_kurt_r) + Math.abs(f.f36b_pixel_kurt_g) + Math.abs(f.f36c_pixel_kurt_b)) / 3;
    if (avgKurt < 0.3) push(+1, `像素分布接近正态 (avg|kurt|=${avgKurt.toFixed(2)})`, avgKurt, 'pixel');

    // Channel correlation — real photos often show 0.85-0.97, AI can be different
    const minCorr = Math.min(f.f37_rg_correlation, f.f38_rb_correlation, f.f39_gb_correlation);
    if (minCorr < 0.6) push(+1, `通道间相关性低 (min=${minCorr.toFixed(2)})`, minCorr, 'pixel');

    // --- Spatial correlation ---
    const avgHV = (f.f40_horz_corr + f.f41_vert_corr) / 2;
    if (avgHV > 0.995) push(+2, `过度平滑,相邻像素相关性极高 (${avgHV.toFixed(4)})`, avgHV, 'spatial');
    if (avgHV < 0.85) push(-1, `高频噪声较重 (${avgHV.toFixed(4)})`, avgHV, 'spatial');

    // --- Wavelet HH1: AI often has lower HF detail energy ---
    if (f.f50_wavelet_hh_ratio < 0.005) push(+1, `小波 HH 能量偏低 (HH/LL=${f.f50_wavelet_hh_ratio.toExponential(2)})`, f.f50_wavelet_hh_ratio, 'wavelet');

    // --- DCT block variance: AI blocks are more uniform ---
    if (f.f57_dct_block_variance < 100) push(+1, `DCT 块间亮度方差低 (${f.f57_dct_block_variance.toFixed(0)})`, f.f57_dct_block_variance, 'dct');

    const total = votes.reduce((s, v) => s + v.weight, 0);
    const positive = votes.filter(v => v.weight > 0).reduce((s, v) => s + v.weight, 0);
    const negative = -votes.filter(v => v.weight < 0).reduce((s, v) => s + v.weight, 0);
    const positiveFamilies = [...new Set(votes.filter(v => v.weight > 0).map(v => v.family))];

    let verdict, confidence;
    if (total >= 6 && positiveFamilies.length >= 3) { verdict = '频域异常较强'; confidence = 'strong'; }
    else if (total >= 3 && positiveFamilies.length >= 2) { verdict = '存在多类频域异常'; confidence = 'medium'; }
    else if (total >= 1) { verdict = '轻微频域异常'; confidence = 'weak'; }
    else if (total <= -1) { verdict = '未见明显频域异常'; confidence = 'info'; }
    else { verdict = '特征模糊,无法判定'; confidence = null; }

    return { votes, total, positive, negative, positiveFamilies, verdict, confidence, calibrated: false };
}
