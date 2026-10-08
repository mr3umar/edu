
import {
    type Part,
} from '@google/genai';

export async function mediaUrlToPart(url: string, fallbackMime = 'application/octet-stream'): Promise<Part> {
        const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(url);
        if (m) return { inlineData: { mimeType: m[1], data: m[2] } };
    
        const r = await fetch(url);
        if (!r.ok) throw new Error(`MEDIA_FETCH_FAILED ${r.status}: ${url}`);
        const mimeType = r.headers.get('content-type')?.split(';')[0] ?? fallbackMime;
        const data = Buffer.from(await r.arrayBuffer()).toString('base64');
        return { inlineData: { mimeType, data } };
    }

    export function dataUrlToPart(url: string): Part {
        const comma = url.indexOf(',');
        const header = url.slice(5, comma); // after "data:"
        if (!url.startsWith('data:') || comma < 0 || !header.endsWith(';base64')) {
            throw new Error(`INVALID_DATA_URL: ${url.slice(0, 50)}`);
        }
        return {
            inlineData: {
                mimeType: header.slice(0, -';base64'.length), // e.g. image/png, audio/wav
                data: url.slice(comma + 1),
            },
        };
    }