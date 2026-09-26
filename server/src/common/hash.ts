export const hash = (str: string) => {
    let value = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        value = (value << 5) - value + char;
        value &= value; // Convert to 32bit integer
    }
    return new Uint32Array([value])[0].toString(36) as string;
};
