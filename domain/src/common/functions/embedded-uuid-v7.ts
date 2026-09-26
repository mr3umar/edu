let microCounter = 0;

export function embeddedUuidV7(timeMs?: number): string {
    const nowMs = typeof timeMs === 'number' ? timeMs : Date.now();

    const perf = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : 0;
    const microExtra = Math.floor((perf % 1) * 1000); // 0–999 microseconds

    // Timestamp: 48 bits (12 hex chars)
    const timeHex = nowMs.toString(16).padStart(12, '0');

    // microHex (3 hex digits) + counterHex (3 hex digits) = 6 hex digits = 24 bits
    const microHex = microExtra.toString(16).padStart(3, '0');
    const counterHex = (microCounter++ % 0xfff).toString(16).padStart(3, '0');

    // Combine micro+counter into 4 hex digits and apply UUID version 7
    const mid = microHex + counterHex; // 6 hex digits

    // Set version to 7 (UUIDv7), which should be in the 13th hex digit
    const versionedMid = (parseInt(mid.slice(0, 1), 16) & 0x0f | 0x70).toString(16) + mid.slice(1, 4);

    // Random 62 bits (~16 hex digits). We need 4 + 12 = 16 hex digits
    let rand = '';
    for (let i = 0; i < 16; i++) {
        rand += Math.floor(Math.random() * 16).toString(16);
    }

    // Set the variant bits (RFC 4122 variant) in the first hex of the next segment
    const variant = (parseInt(rand[0], 16) & 0x3 | 0x8).toString(16);
    rand = variant + rand.slice(1);

    const uuid =
        timeHex.slice(0, 8) + '-' + // 8
        timeHex.slice(8, 12) + '-' + // 4
        versionedMid + '-' + // 4
        rand.slice(0, 4) + '-' + // 4
        rand.slice(4, 16); // 12

    return uuid;
}
