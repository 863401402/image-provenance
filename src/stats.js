// Public usage stats via counterapi.dev v2.
// Each counter maps to a real user event; numbers render at the bottom
// of the page. Fails silently if the API is unreachable.
//
// The workspace is set to 'Publicly Accessible' on counterapi.dev,
// which means NO Authorization header is sent. This matters: with the
// header, the browser triggers a CORS preflight that counterapi's
// Cloudflare layer rejects (it doesn't whitelist 'Authorization' in
// Access-Control-Allow-Headers). Without it, the request becomes a
// "simple" CORS request and just works.

const WORKSPACE = 'image-provenance';
const API = 'https://api.counterapi.dev/v2';

const COUNTERS = [
    { key: 'image-provenance-visits',      label: '访问', el: 'statVisits' },
    { key: 'image-provenance-analyses',    label: '检测', el: 'statAnalyses' },
    { key: 'image-provenance-conversions', label: '转换', el: 'statConversions' },
];

const SESSION_KEY = 'ip_visited';
const bumpChains = new Map();

export function isTrackingEnabled(hostname = globalThis.location?.hostname || '') {
    return hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1';
}

export function normalizeIncrement(amount) {
    const value = Math.floor(Number(amount));
    return Number.isFinite(value) ? Math.max(0, Math.min(200, value)) : 1;
}

async function readCounter(key) {
    try {
        const r = await fetch(`${API}/${WORKSPACE}/${key}`);
        if (!r.ok) return null;
        const data = await r.json();
        return data?.data?.up_count ?? data?.count ?? data?.value ?? null;
    } catch { return null; }
}

async function bumpCounter(key) {
    try {
        const r = await fetch(`${API}/${WORKSPACE}/${key}/up`);
        if (!r.ok) return null;
        const data = await r.json();
        return data?.data?.up_count ?? data?.count ?? data?.value ?? null;
    } catch { return null; }
}

function renderCount(elId, val) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = val != null ? val.toLocaleString() : '—';
}

function queueBumps(key, elId, amount) {
    const count = normalizeIncrement(amount);
    if (!count || !isTrackingEnabled()) return Promise.resolve(null);

    const previous = bumpChains.get(key) || Promise.resolve();
    const next = previous.catch(() => null).then(async () => {
        let latest = null;
        for (let index = 0; index < count; index++) {
            const value = await bumpCounter(key);
            if (value == null) break;
            latest = value;
        }
        if (latest != null) renderCount(elId, latest);
        return latest;
    });
    bumpChains.set(key, next);
    return next;
}

// Batch callers pass the number of successfully processed files. CounterAPI's
// public endpoint increments by one, so each counter is serialized to avoid
// out-of-order responses rendering an older value.
export function trackAnalysis(amount = 1) {
    return queueBumps('image-provenance-analyses', 'statAnalyses', amount);
}

export function trackConversion(amount = 1) {
    return queueBumps('image-provenance-conversions', 'statConversions', amount);
}

// Called once on page load — bump visits (session-guarded) then fetch
// all four current totals for display.
export async function initStats() {
    const bar = document.getElementById('statsBar');
    if (!bar) return;
    bar.classList.remove('hidden');

    const firstVisit = isTrackingEnabled() && !sessionStorage.getItem(SESSION_KEY);
    if (firstVisit) {
        const n = await bumpCounter('image-provenance-visits');
        renderCount('statVisits', n);
        sessionStorage.setItem(SESSION_KEY, '1');
    } else {
        readCounter('image-provenance-visits').then(n => renderCount('statVisits', n));
    }
    // Fetch the other two in parallel.
    COUNTERS.slice(1).forEach(({ key, el }) => {
        readCounter(key).then(n => renderCount(el, n));
    });
}
