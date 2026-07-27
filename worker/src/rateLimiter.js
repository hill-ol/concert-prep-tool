const MIN_INTERVAL_MS = 1000;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let queueTail = Promise.resolve();

export function withRateLimit(fn) {
    return (...args) => {
        const result = queueTail.then(() => fn(...args));

        // Advance the queue on a fixed timer, deliberately NOT chained off
        // fn(...args) itself. This guarantees at least MIN_INTERVAL_MS between
        // call *starts* (not between completions), and means a slow or rejected call can never stall or break
        // the queue for calls behind it.
        queueTail = queueTail.then(() => delay(MIN_INTERVAL_MS));

        return result;
    }
}