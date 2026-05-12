// Shared utilities — DOM / bytes / hashing / formatting

export async function sha256(buffer) {
    if (window.crypto?.subtle?.digest) {
        try {
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch {}
    }
    return sha256Pure(new Uint8Array(buffer));
}

function sha256Pure(msg) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const R = (n, x) => (x >>> n) | (x << (32 - n));
    const l = msg.length, bitLen = l * 8, totalLen = (Math.floor((l + 8) / 64) + 1) * 64;
    const padded = new Uint8Array(totalLen);
    padded.set(msg); padded[l] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
    dv.setUint32(totalLen - 4, bitLen >>> 0, false);
    let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
    const w = new Uint32Array(64);
    for (let off = 0; off < totalLen; off += 64) {
        for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const s0 = R(7, w[i-15]) ^ R(18, w[i-15]) ^ (w[i-15] >>> 3);
            const s1 = R(17, w[i-2]) ^ R(19, w[i-2]) ^ (w[i-2] >>> 10);
            w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
        }
        let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
        for (let i = 0; i < 64; i++) {
            const S1 = R(6, e) ^ R(11, e) ^ R(25, e);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
            const S0 = R(2, a) ^ R(13, a) ^ R(22, a);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        h0 = (h0+a)>>>0; h1 = (h1+b)>>>0; h2 = (h2+c)>>>0; h3 = (h3+d)>>>0;
        h4 = (h4+e)>>>0; h5 = (h5+f)>>>0; h6 = (h6+g)>>>0; h7 = (h7+h)>>>0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map(n => n.toString(16).padStart(8, '0')).join('');
}

export function bytesToString(uint8) {
    let str = '';
    for (let i = 0; i < uint8.length; i += 65536) {
        str += String.fromCharCode.apply(null, uint8.subarray(i, i + 65536));
    }
    return str;
}

export function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

export function getImageDims(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            resolve(`${img.naturalWidth} x ${img.naturalHeight}px`);
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => resolve('—');
        img.src = URL.createObjectURL(file);
    });
}

export function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}
