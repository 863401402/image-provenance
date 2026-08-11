const CSV_COLUMNS = [
    ['fileName', 'File name'],
    ['status', 'Status'],
    ['operation', 'Operation'],
    ['mode', 'Mode'],
    ['type', 'MIME type'],
    ['size', 'Size (bytes)'],
    ['width', 'Width'],
    ['height', 'Height'],
    ['sha256', 'SHA-256'],
    ['verdict', 'Verdict'],
    ['c2paStatus', 'C2PA status'],
    ['c2paState', 'C2PA state'],
    ['c2paVerified', 'C2PA verified'],
    ['digitalSourceType', 'Digital source type'],
    ['frequencyApplicable', 'Frequency applicable'],
    ['frequencyConfidence', 'Frequency confidence'],
    ['frequencyScore', 'Frequency score'],
    ['frequencyFamilies', 'Frequency evidence families'],
    ['suitabilityReasons', 'Suitability reasons'],
    ['outputName', 'Output name'],
    ['outputSize', 'Output size (bytes)'],
    ['outputWidth', 'Output width'],
    ['outputHeight', 'Output height'],
    ['jpegQuality', 'JPEG quality'],
    ['backgroundColor', 'Background color'],
    ['profileMake', 'Camera make'],
    ['profileModel', 'Camera model'],
    ['watermarkDisrupted', 'Watermark processing'],
    ['error', 'Error'],
];

function exportRow(record) {
    const report = record.result?.report || record.report || null;
    const conversion = record.result?.conversion || record.conversion || null;
    const file = report?.file || record.file || {};
    return {
        fileName: file.name || record.name || '',
        status: record.status || (report ? 'completed' : 'unknown'),
        operation: record.operation || (conversion ? 'convert' : 'detect'),
        mode: report?.mode || record.mode || '',
        type: file.type || '',
        size: file.size ?? '',
        width: file.width ?? '',
        height: file.height ?? '',
        sha256: file.sha256 || '',
        verdict: report?.verdict || '',
        c2paStatus: report?.c2pa?.status || '',
        c2paState: report?.c2pa?.state || '',
        c2paVerified: report?.c2pa ? String(report.c2pa.verified) : '',
        digitalSourceType: report?.c2pa?.digitalSourceType || '',
        frequencyApplicable: report?.frequency ? String(report.frequency.applicable) : '',
        frequencyConfidence: report?.frequency?.confidence || '',
        frequencyScore: report?.frequency?.score ?? '',
        frequencyFamilies: report?.frequency?.positiveFamilies?.join('|') || '',
        suitabilityReasons: report?.frequency?.suitabilityReasons?.join('|') || '',
        outputName: conversion?.outputName || '',
        outputSize: conversion?.outputSize ?? '',
        outputWidth: conversion?.width ?? '',
        outputHeight: conversion?.height ?? '',
        jpegQuality: conversion?.quality ?? '',
        backgroundColor: conversion?.backgroundColor || '',
        profileMake: conversion?.profileMake || '',
        profileModel: conversion?.profileModel || '',
        watermarkDisrupted: conversion ? String(conversion.watermarkDisrupted) : '',
        error: record.error?.message || record.error || '',
    };
}

function csvCell(value) {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeBatchCsv(records) {
    const header = CSV_COLUMNS.map(([, label]) => csvCell(label)).join(',');
    const rows = records.map(record => {
        const row = exportRow(record);
        return CSV_COLUMNS.map(([key]) => csvCell(row[key])).join(',');
    });
    return `\uFEFF${[header, ...rows].join('\r\n')}`;
}

export function serializeBatchJson(records, generatedAt = new Date().toISOString()) {
    return JSON.stringify({
        schemaVersion: 1,
        generatedAt,
        items: records.map(exportRow),
    }, null, 2);
}

export { exportRow };
