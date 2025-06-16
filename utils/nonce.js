import crypto from 'crypto';

const CSRF_SECRET="5e508b4d7f0363c0a24c7deeebb1c630a2f6d59e7cbb3c1f4b2f3e2d1c0b9a88"

function currentTick() {
    return Math.floor(Date.now() / 43200000);      // 12-hour “tick”
}

export function createNonce(action, user = '0') {
    const tick = currentTick();
    const hmac = crypto
        .createHmac('sha256', CSRF_SECRET)
        .update(`${action}|${user}|${tick}`)
        .digest('hex');
    return Buffer.from(`${tick}:${hmac}`).toString('base64');
}

export function verifyNonce(token, action, user = '0') {
    try {
        const [tickStr, sig] = Buffer.from(token, 'base64').toString('utf8').split(':');
        const tick = Number(tickStr);
        const now  = currentTick();
        if (tick !== now && tick !== now - 1) return false;      // 24-h window

        const expected = crypto
        .createHmac('sha256', CSRF_SECRET)
        .update(`${action}|${user}|${tick}`)
        .digest('hex');
        return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch { return false; }
}