import * as http from 'http';

export const getRequestBody = (req: http.IncomingMessage) => {
    let text = '';
    const prm = new Promise<any>((res, rej) => {
        if ((req as any).body) {
            // for express module
            res((req as any).body);
            return;
        }
        req.on('data', (chunk: any) => {
            text += chunk;
        }).on('end', () => {
            res(text);
        });
    });

    return prm;
};
