import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import { Fetch, HTTPError } from '@dija/gormic-service-kit-domain';
import * as URL from 'url';

// const factory = {
//     create: function () {
//         return Promise.resolve({
//             http,
//             https,
//         });
//     },
//     destroy: function (client: any) {
//         return Promise.resolve();
//         // client.disconnect();
//     },
// };

// const opts: genericPool.Options = {
//     max: 100, // maximum size of the pool
//     min: 1, // minimum size of the pool
//     acquireTimeoutMillis: 1000 * 10,
// };

// const pool = genericPool.createPool(factory, opts);

const TIMEOUT = 30 * 1000;

const clients: Record<string, http2.ClientHttp2Session>  = {}
const getClient = (protocol: string, host: string, port: number) => {

    const rootUrl = `${protocol}//${host}:${port}`
    if(!clients[rootUrl]){
        console.log(`Creating http2 client with url: ${rootUrl}`)
        const client = http2.connect(rootUrl);

        client.on('error', (err: any) => {
            console.error('[HTTP/2 client error]', err.message, err.code, err);

            delete clients[rootUrl]
            if (!client.closed && !client.destroyed) {
                client.destroy();
            }
        });

        client.on('close', () => {
            delete clients[rootUrl]
            console.warn('[HTTP/2 client] Session closed');
        });
        clients[rootUrl] = client
    }
    return clients[rootUrl]
}

export const createServiceFetch = (url?: string) => {
    let parsedUrl: URL.UrlWithStringQuery | undefined;

    if (url) {
        parsedUrl = URL.parse(url);

        if (!parsedUrl.hostname) {
            throw new Error(`Invalid fetch URL: ${url}`);
        }
    }

    const agent = new http.Agent({keepAlive:true})
    const agentTLS = new https.Agent({keepAlive:true})

    const fetch: Fetch = async (options) => {
        const body =
            typeof options.body === 'string' || options.body! instanceof String
                ? options.body
                : JSON.stringify(options.body);

        // const client = await pool.acquire();


        let protocol = parsedUrl?.protocol;
        let hostname = parsedUrl?.hostname;
        let port = parsedUrl?.port;

        if (options.url) {
            url = options.url;
            const parsedUrl2 = URL.parse(options.url);
            protocol = parsedUrl2.protocol;
            hostname = parsedUrl2.hostname;
            port = parsedUrl2.port;
        }

        if(hostname?.includes("taj-data") || port == '8888'){

            port = '8001'

            const client = getClient(protocol!, hostname!, Number(port ?? (protocol == 'https:' ? 443 : 80)))

            return new Promise<any>((res, rej) => {
                const origin = {
                    options,
                };

                try {
                    const req = client
                        .request(
                            {
                                ":path": options.path,
                                ":method": options.method,
                                "content-type": "application/json",
                                "content-length": Buffer.byteLength(body as string),
                                ...options.headers,
                                timeout: TIMEOUT,
                            },
                        )
                    
                    if(options.body){
                        req.write(body)
                    }
                    req.on('timeout', () => {
                        // pool.release(client).catch(() => {});

                        rej(new HTTPError(408, `timeout exceeded (${TIMEOUT}). URL: ${url}${options.path}`, origin));
                        req.destroy();
                    });

                    let chunks: any[] = [];
                    req.on('data', (chunk) => {
                        chunks.push(chunk)
                    });

                    req.on('end', () => {
                        let data: any
                        const buffer = Buffer.concat(chunks);
                        if (options.returnType === undefined || options.returnType === 'string') {
                            data = buffer.toString('utf-8')
                          } else if (options.returnType === 'buffer') {
                            data = buffer
                          } else {
                            throw new Error(`Unsupported fetch.returnType: ${options.returnType}`);
                          }
                        res({ statusCode: 200, data });
                        // client.close(); // Close connection after request
                    });

                    req.on('error', (err: any) => {
                        // pool.release(client).catch(() => {});

                        if (err) {
                            if (err.code == 'ECONNREFUSED') {
                                rej(
                                    new HTTPError(
                                        503,
                                        `${err.message},ECONNREFUSED,ENETUNREACH,NOT_REACHABLE. URL: ${url}${options.path}`,
                                        origin,
                                    ),
                                );
                            } else {
                                rej(new HTTPError(520, `${err.message}. URL: ${url}${options.path}`, origin));
                            }
                        } else {
                            rej(new HTTPError(520, `err is undefined. URL: ${url}${options.path}`, origin));
                        }
                    });
                    req.end()
                } catch (err: any) {
                    // pool.release(client).catch(() => {});

                    rej(new HTTPError(520, `${err.message}. URL: ${url}${options.path}`, origin));
                }
            });
        }
        else{
        
            // const lib = (protocol == 'https:' ? client.https : client.http) as typeof http;
            const lib = (protocol == 'https:' ? https : http);

            return new Promise<any>((res, rej) => {
                const origin = {
                    options,
                };

                try {

                    const req = lib
                        .request(
                            {
                                hostname,
                                port,
                                path: options.path,
                                headers: {...options.headers, 'Connection': 'keep-alive'},
                                method: options.method,
                                timeout: TIMEOUT,
                                agent: protocol == 'https:' ? agentTLS : agent,
                            },
                            (resp) => {
                                const chunks: Buffer[] = [];
                                resp.on('data', (chunk) => {
                                    chunks.push(chunk);
                                });
                                resp.on('end', () => {
                                    let data: any
                                    const buffer = Buffer.concat(chunks);
                                    if (options.returnType === undefined || options.returnType === 'string') {
                                        data = buffer.toString('utf-8')
                                    } else if (options.returnType === 'buffer') {
                                        data = buffer
                                    } else if(options.returnType === 'base64') {
                                        data = buffer.toString('base64')
                                    }else {
                                        throw new Error(`Unsupported fetch.returnType: ${options.returnType}`);
                                    }
                                    res({ statusCode: resp.statusCode, data });
                                });
                                resp.on('error', (err: any) => {
                                    rej(new HTTPError(520, `${err.message}. URL: ${url}${options.path}`, origin));
                                });
                            },
                        )
                    req.setTimeout(TIMEOUT)
                    
                    req.on('timeout', () => {
                        // pool.release(client).catch(() => {});

                        rej(new HTTPError(408, `timeout exceeded (${TIMEOUT}). URL: ${url}${options.path}`, origin));
                        req.destroy();
                    });

                    req.on('error', (err: any) => {
                        // pool.release(client).catch(() => {});

                        if (err) {
                            if (err.code == 'ECONNREFUSED') {
                                rej(
                                    new HTTPError(
                                        503,
                                        `${err.message},ECONNREFUSED,ENETUNREACH,NOT_REACHABLE. URL: ${url}${options.path}`,
                                        origin,
                                    ),
                                );
                            } else {
                                rej(new HTTPError(520, `${err.message} ${err.code}. URL: ${url}${options.path}`, origin));
                            }
                        } else {
                            rej(new HTTPError(520, `err is undefined. URL: ${url}${options.path}`, origin));
                        }
                    });

                    req.end(body);
                } catch (err: any) {
                    // pool.release(client).catch(() => {});

                    rej(new HTTPError(520, `${err.message}. URL: ${url}${options.path}`, origin));
                }
            });
        }
    }

    return fetch;
};
