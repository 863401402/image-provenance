import { getAiGenerationHints } from './metadata.js';
import { hasVerifiedAiSource } from './c2pa-verify.js';

// A summary of metadata evidence, not a second pixel classifier or camera score.
export function analyzeMetadataEvidence(meta = {}, jumbf = {}, aigc = {}) {
    const verification = jumbf.verification || {};
    const hints = getAiGenerationHints(meta);
    let kind;
    if (hasVerifiedAiSource(verification)) kind = 'verifiedAi';
    else if (aigc.confidence === 'medium' && aigc.declaration === 'generated') kind = 'declaredAi';
    else if (hints.length) kind = 'toolAi';
    else if (aigc.confidence === 'weak') kind = 'uncertain';
    else if (verification.invalid) kind = 'invalid';
    else if (verification.verified) kind = 'verifiedSource';
    else if (aigc.status && !['absent', 'present'].includes(aigc.status)) kind = 'unreadable';
    else if (meta.Make || meta.Model || meta.LensModel || meta.MakerNote || meta.makerNote) kind = 'camera';
    else if (Object.keys(meta).some(key => !key.startsWith('_'))) kind = 'present';
    else if (meta._error) kind = 'unreadable';
    else if (jumbf.present || verification.present) kind = 'unverified';
    else kind = 'none';
    return {
        kind,
        level: ['verifiedAi', 'declaredAi', 'toolAi'].includes(kind) ? 'ai'
            : ['uncertain', 'invalid', 'unreadable'].includes(kind) ? 'medium' : 'none',
        icon: ['verifiedAi', 'declaredAi', 'toolAi'].includes(kind) ? '🤖' : kind === 'camera' ? '📷' : '○',
        titleKey: `meta.evidence.${kind}.title`,
        subKey: `meta.evidence.${kind}.sub`,
    };
}

export function normalizeGpsCoordinate(value, ref, limit) {
    let number;
    if (Array.isArray(value) && value.length === 3 && value.every(item => typeof item === 'number' && Number.isFinite(item))) {
        const [degrees, minutes, seconds] = value;
        if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
        number = Math.sign(degrees || 1) * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
    } else if (typeof value === 'number') number = value;
    else if (typeof value === 'string' && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim())) number = Number(value);
    else return null;
    if (!Number.isFinite(number) || Math.abs(number) > limit) return null;
    if (ref === 'S' || ref === 'W') return -Math.abs(number);
    if (ref === 'N' || ref === 'E') return Math.abs(number);
    return number;
}
