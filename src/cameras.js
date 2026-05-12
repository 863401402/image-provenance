// Camera profiles for the "re-encode as real photo" pipeline.
// Ported verbatim from server.py CAMERA_PROFILES.

export const CAMERA_PROFILES = {
    iphone15pro: {
        displayName: 'iPhone 15 Pro Max', icon: '📱',
        Make: 'Apple', Model: 'iPhone 15 Pro Max', Software: '18.5',
        LensModel: 'iPhone 15 Pro Max back triple camera 6.765mm f/1.78',
        FocalLength: 6.765, FNumber: 1.78, ISO: 100,
        ExposureTime: [1, 120], WhiteBalance: 'Auto', ColorSpace: 'sRGB', Flash: 'No Flash',
    },
    canonr5: {
        displayName: 'Canon EOS R5', icon: '📷',
        Make: 'Canon', Model: 'Canon EOS R5', Software: 'Adobe Lightroom Classic',
        LensModel: 'RF24-70mm F2.8 L IS USM', LensMake: 'Canon',
        FocalLength: 35, FNumber: 2.8, ISO: 400,
        ExposureTime: [1, 250], WhiteBalance: 'Auto', ColorSpace: 'sRGB', Flash: 'No Flash',
        ExposureProgram: 'Aperture priority', MeteringMode: 'Multi-segment',
        Orientation: 'Horizontal (normal)',
    },
    sonya7iv: {
        displayName: 'Sony A7 IV', icon: '📷',
        Make: 'SONY', Model: 'ILCE-7M4', Software: 'Adobe Lightroom Classic',
        LensModel: 'FE 24-70mm F2.8 GM II', LensMake: 'Sony',
        FocalLength: 50, FNumber: 2.8, ISO: 200,
        ExposureTime: [1, 160], WhiteBalance: 'Auto', ColorSpace: 'sRGB', Flash: 'No Flash',
        ExposureProgram: 'Manual', MeteringMode: 'Multi-segment',
        Orientation: 'Horizontal (normal)',
    },
    samsungs24: {
        displayName: 'Galaxy S24+', icon: '📱',
        Make: 'samsung', Model: 'SM-S9260', Software: 'S9260ZCU4AXK4',
        LensModel: 'Samsung Galaxy S24+ Rear Camera',
        FocalLength: 6.3, FNumber: 1.8, ISO: 80,
        ExposureTime: [1, 100], WhiteBalance: 'Auto', ColorSpace: 'sRGB', Flash: 'No Flash',
    },
    xiaomi15: {
        displayName: '小米15 Pro', icon: '📱',
        Make: 'Xiaomi', Model: '24129PN74C', Software: 'MIUI Camera',
        LensModel: 'Xiaomi 15 Pro Rear Main Camera',
        FocalLength: 7.59, FNumber: 1.44, ISO: 50,
        ExposureTime: [1, 200], WhiteBalance: 'Auto', ColorSpace: 'sRGB', Flash: 'No Flash',
    },
};
