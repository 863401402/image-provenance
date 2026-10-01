// IPTC Digital Source Type vocabulary: only these two terms declare generative AI.
// https://cv.iptc.org/newscodes/digitalsourcetype/
export const AI_SOURCE_TYPES = [
    'trainedAlgorithmicMedia',
    'compositeWithTrainedAlgorithmicMedia',
];

export const SOURCE_TYPES = [...AI_SOURCE_TYPES,
    'algorithmicMedia', 'dataDrivenMedia', 'digitalCapture', 'computationalCapture',
    'digitalCreation', 'composite', 'screenCapture', 'humanEdits',
    'algorithmicallyEnhanced', 'negativeFilm', 'positiveFilm', 'virtualRecording',
];

export function normalizeSourceType(value) {
    if (typeof value !== 'string') return null;
    const type = value.trim().split(/[\/#]/).pop();
    return SOURCE_TYPES.includes(type) ? type : null;
}

export function isAiSourceType(value) {
    return AI_SOURCE_TYPES.includes(normalizeSourceType(value));
}
