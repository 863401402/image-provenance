// Merge provenance markers and pixel heuristics without treating missing
// metadata as proof that an image is camera-original.

export function classifyEvidence(detections = [], frequencyScore) {
    const aiDetections = detections.filter(d => d.category !== 'edit' && d.aiEvidence !== false);
    const provenanceHits = aiDetections.filter(d => d.hit
        && (d.confidence === 'strong' || d.confidence === 'medium'));
    const weakHits = aiDetections.filter(d => d.hit && d.confidence === 'weak');
    const editHits = detections.filter(d => d.hit && d.category === 'edit');

    if (provenanceHits.length > 0) return { kind: 'provenance', provenanceHits };
    if (frequencyScore === undefined) return { kind: 'pending' };
    if (frequencyScore?.applicable === false) return { kind: 'unsuitable' };
    if (frequencyScore && (frequencyScore.confidence === 'strong'
        || frequencyScore.confidence === 'medium')) {
        return { kind: 'pixel', frequencyScore };
    }
    if (weakHits.length > 0 || frequencyScore?.confidence === 'weak') {
        return { kind: 'uncertain' };
    }
    if (editHits.length > 0) return { kind: 'edit' };
    return { kind: 'none' };
}
