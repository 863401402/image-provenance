function canceledResult(item, index) {
    return { item, index, status: 'canceled', result: null, error: null };
}

export async function runBatchQueue(items, worker, options = {}) {
    const concurrency = Math.max(1, Math.min(8, Math.floor(options.concurrency || 2)));
    const signal = options.signal;
    const onUpdate = options.onUpdate || (() => {});
    const output = new Array(items.length);
    let cursor = 0;

    const update = (index, status, extra = {}) => {
        const state = { item: items[index], index, status, ...extra };
        output[index] = state;
        onUpdate(state);
        return state;
    };

    async function consume() {
        while (true) {
            if (signal?.aborted || cursor >= items.length) return;
            const index = cursor++;
            update(index, 'running', { result: null, error: null });
            try {
                const result = await worker(items[index], index, signal);
                if (signal?.aborted) update(index, 'canceled', { result: null, error: null });
                else update(index, 'completed', { result, error: null });
            } catch (error) {
                const canceled = signal?.aborted || error?.name === 'AbortError';
                update(index, canceled ? 'canceled' : 'failed', {
                    result: null,
                    error: canceled ? null : error,
                });
            }
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => consume(),
    );
    await Promise.all(workers);

    for (let index = 0; index < items.length; index++) {
        if (!output[index]) {
            output[index] = canceledResult(items[index], index);
            onUpdate(output[index]);
        }
    }
    return output;
}
