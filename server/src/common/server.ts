import { AccessKeyData, GetDeployment, GetInstance } from '@dija/gormic-cloud-public';
import { CheckPermissionForUser } from '@dija/gormic-iam-public';
import { Service, isServiceError } from '@dija/gormic-service-kit-domain';
import * as http from 'http';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { CryptoUtil } from './crypto.js';
import { getRequestBody } from './get-request-body.js';
import { hash } from './hash.js';
import { delayPromise } from '../delay-promise.js';
import { embeddedUuidV7 } from 'edu-ai-domain';


const rateLimiters: { [key: string]: RateLimiterMemory } = {
    // default: new RateLimiterMemory({
    //     points: 100,
    //     duration: 60 * 1, // seconds
    // }),
    createSurvey: new RateLimiterMemory({
        points: 10,
        duration: 60 * 1, // seconds
    }),
    contactUs: new RateLimiterMemory({
        points: 10,
        duration: 60 * 1, // seconds
    }),
};

const HOST_KEY = hash(process.env.HOSTNAME ? process.env.HOSTNAME : 'main');
let REQUEST_SEQ = 0;
const REQUEST_SEQ_SIZE = 5;
export const generateRequestId = () => {
    if (REQUEST_SEQ >= Math.pow(REQUEST_SEQ_SIZE, 5) - 1) {
        REQUEST_SEQ = 0;
    }
    REQUEST_SEQ += 1;
    const id = new Date().getTime() + `-${HOST_KEY}-${String(REQUEST_SEQ).padStart(REQUEST_SEQ_SIZE, '0')}`;
    return id;
};

export type GetCurrentDeployment = {
    Params: {};
    Data: GetDeployment['Data'];
    ErrorCode: GetDeployment['ErrorCodes'];
};

export type Scope = {
    instanceId: string;
    entryPoint: string;
    sourceInstanceId?: string;
    requestId: string;
    token?: string;
    accessKeyData?: AccessKeyData;
    clientIamId: string;
    clientUserId: string;
    trace: string;
    appId: string, deploymentId: string
}

export const createServer = (
    appId: string,
    deploymentId: string,
    services: { [key: string]: Service<any> },
    // getInstance: Service<GetInstance>,
    getDeployment: Service<GetDeployment>,
    checkPermissionForUser: Service<CheckPermissionForUser>,
    // memberIAMInstanceKeys: string[],
    publicKey: string,
    defaultInstanceId: string,
    customRoute?: (req: http.IncomingMessage, res: http.ServerResponse, scope: Scope) => Promise<any>,
    onParseForm?: (
        req: http.IncomingMessage,
        res: http.ServerResponse,
        serviceName: string,
        scope: any,
    ) => Promise<any>,
) => {
    const log = (message: any) => {
        const date = new Date().toISOString();
        console.log(`[${date}] ${message}`);
    };

    const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const url = req.url as string;
        const contentType = req.headers['content-type'] || '';

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, g-locale, g-instance-id, g-branch-id, Authorization, G-Trace, g-client-user-id, g-client-iam-id, g-filename',
        );
        res.setHeader('Access-Control-Allow-Credentials', 'true'); // If needed

        if (req.method === 'OPTIONS') {
            return res.end();
        }

        const trace = req.headers['g-trace'] as string;

        if (trace) {
            log(`[info] [server.handleRequest] started`);
        }

        const serviceName = url.split('/')[2];

        const requestId = req.headers['g-request-id'] as string;
        const auth = req.headers.authorization as string | undefined;

        const token = auth?.split(' ')[1];
        const scope: Scope = {
            instanceId: (req.headers['g-instance-id'] as string) ?? defaultInstanceId,
            entryPoint: serviceName,
            sourceInstanceId: req.headers['g-source-instance-id'] as string,
            requestId: requestId ?? generateRequestId(),
            token,
            clientIamId: req.headers['g-client-iam-id'] as string,
            clientUserId: req.headers['g-client-user-id'] as string,
            trace,
            appId, deploymentId
        };
        

        try {
            if (url?.search('/api/') === 0 && req.method === 'POST') {
                res.setHeader('Content-Type', 'application/json');


                const remoteAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

                const limiter = rateLimiters[serviceName as keyof typeof rateLimiters];
                if (!limiter) {
                    // limiter = rateLimiters.default;
                }

                if (limiter) {
                    try {
                        //   "Retry-After": rateLimiterRes.msBeforeNext / 1000,
                        //   "X-RateLimit-Limit": opts.points,
                        //   "X-RateLimit-Remaining": rateLimiterRes.remainingPoints,
                        //   "X-RateLimit-Reset": new Date(Date.now() + rateLimiterRes.msBeforeNext)
                        await limiter.consume(remoteAddress!, 1);
                        // res.status(429).send('Too Many Requests');
                    } catch (err) {
                        console.error(err);
                        const rate = err as RateLimiterRes;

                        res.statusCode = 429;
                        const resp = {
                            app: appId,
                            service: serviceName,
                            error: {
                                code: 'ServerError',
                                serverError: {
                                    code: 429,
                                    retryAfter: Math.ceil(rate.msBeforeNext / 1000),
                                },
                            },
                        };

                        res.write(JSON.stringify(resp));
                        res.end();
                        return;
                    }
                }


                try {
                    if (scope.token) {
                        // const accessKey = decrypt<UserAccessKeyData>(scope.token);
                        const accessKeyData = CryptoUtil.verifyPayload(scope.token, publicKey);
                        console.log(accessKeyData, '>>>')
                        if (accessKeyData) {
                            scope.accessKeyData = accessKeyData;
                            if (!scope.clientIamId) {
                                scope.clientIamId = accessKeyData.iamId;
                                scope.clientUserId = accessKeyData.ownerId;
                            }
                        } else {
                            scope.token = undefined;
                        }
                        if (trace) {
                            log(`[info] [server.handleRequest] access token validated`);
                        }
                    }

                    if (trace) {
                        log(`[info] [server.handleRequest] deployment loaded`);
                    }

                    let authorized = false;


                    const deplRes = await getDeployment({ id: deploymentId }, {appId, deploymentId});
                    const resource = deplRes.data.deployment?.resources?.find((r) => r.key == serviceName);

                    if (!scope.token) {
                        if (resource?.access != 'anonymous' && resource?.access != 'custom') {
                            res.statusCode = 401;
                            return res.end(
                                JSON.stringify({
                                    app: appId,
                                    service: serviceName,
                                    error: {
                                        code: token ? 'INVALID_TOKEN' : 'MISSING_TOKEN',
                                    },
                                }),
                            );
                        }
                    }

                    if (resource?.access == 'anonymous') {
                        authorized = true;
                    } else if (resource?.access == 'custom') {
                        // service should handle access security
                        authorized = true;
                    } else if (
                        resource?.access == 'member' &&
                        scope?.accessKeyData?.iamId == "users"
                    ) {
                        // allow
                        authorized = true;
                    } else if (scope.accessKeyData?.ownerId == appId) {
                        authorized = true;
                    } else {
                        const permRes = await checkPermissionForUser(
                            {
                                userId: scope.accessKeyData?.ownerId,
                                instanceId: scope.instanceId,
                                resource: {
                                    key: serviceName,
                                },
                            },
                            scope,
                        ).catch((err) => {
                            console.error(err);
                            if (!isServiceError(err) && err.message.includes('Missing dependency')) {
                                const data: CheckPermissionForUser['Data'] = {
                                    action: 'deny',
                                };
                                return { data };
                            }
                            throw err;
                        });
                        if (permRes.data.action == 'allow') {
                            authorized = true;
                        }
                    }

                    if (!authorized) {
                        res.statusCode = 401;
                        return res.end(
                            JSON.stringify({
                                app: appId,
                                service: serviceName,
                                error: {
                                    code: 'UNAUTHORIZED',
                                },
                            }),
                        );
                    }

                    if (trace) {
                        log(`[info] [server.handleRequest] authrization checked`);
                    }

                    const service = services[serviceName as keyof typeof services];
                    if (!service) {
                        res.statusCode = 404;
                        return res.end(
                            JSON.stringify({
                                error: {
                                    app: appId,
                                    service: serviceName,
                                    code: 'UNKNOWN_SERVICE',
                                },
                            }),
                        );
                    }

                    let params: any;

                    const isUpload = contentType.startsWith('multipart/form-data') || contentType === 'application/octet-stream';
                    if (isUpload) {
                        // if (!onParseForm) {
                        //     throw new Error('No form parser provided.');
                        // }
                        // try {
                        //     params = await onParseForm(req, res, serviceName, scope);
                        // } catch (e: any) {
                        //     throw new Error(`Form parse failed: ${e.message}`);
                        // }

                        const fileId = embeddedUuidV7()
                        const fileName = req.headers['g-filename'];
                        let totalFileSize = parseInt(req.headers['content-length']! ?? -1);
                        if(totalFileSize === -1){
                            res.statusCode = 500;
                            res.write(`Missing content-length header`);
                            res.end();
                            return;
                        }
                        let uploadedFileSize = 0;
                        let chunkIndex = -1

                        let uploadQueue = Promise.resolve();
                        let uploadError: unknown = null;


                        req.on('data', async (chunk: Buffer) => {
                        
                            uploadedFileSize += chunk.length;
                            chunkIndex++;

                            uploadQueue = uploadQueue.then(async () => {
                                if (uploadError) return;

                                uploadedFileSize += chunk.length;
                                chunkIndex++;

                        
                                try {
                                    const result = await service({
                                        fileId,
                                        fileName,
                                        fileSize: totalFileSize,
                                        chunkIndex,
                                        chunk
                                    }, scope);

                                    res.statusCode = 200;
                                    if (result) {
                                        const ok = res.write(JSON.stringify(result));

                                        if (!ok) {
                                            req.pause();

                                            res.once('drain', () => {
                                                req.resume();
                                            });
                                        }
                                    }
                                }
                                catch(err: any){
                                    console.error(`[error] ${JSON.stringify(err)}`, err.message, err.stack);
                                    res.statusCode = 500;
                                    if (isServiceError(err)) {
                                        delete err.result.error!.origin;
                                        // delete err.result.error!.description;
                                        delete (err.result as any).params;
                                        (err.result as any).requestId = requestId;
                                        (err.result as any).instanceId = scope.instanceId;
                                        if (err.result.warnings) {
                                            // to secure sensitive info.
                                            err.result.warnings.forEach((warn: any) => {
                                                delete warn.origin;
                                            });
                                        }
                                        res.write(JSON.stringify(err.result));
                                    } else {
                                        res.statusCode = 500;
                                        res.write(
                                            JSON.stringify({
                                                instanceId: scope.instanceId,
                                                requestId: scope.requestId,
                                                error: {
                                                    code: 'Unknown',
                                                },
                                            }),
                                        );
                                    }
                                    res.end();
                                    req.destroy();
                                }
                            })
                        });
                        
                        req.on('end', async () => {

                            await uploadQueue;

                            if (uploadError) {
                                return;
                            }

                            try{
                                const result = await service({
                                    fileId,
                                    fileName,
                                    fileSize: totalFileSize,
                                    completed: true,
                                }, scope);
                                res.statusCode = 200;
                                if (result) {
                                    res.write(JSON.stringify(result));
                                }
                                return res.end();
                            }
                            catch(err: any){
                                console.error(`[error] ${JSON.stringify(err)}`, err.message, err.stack);
                                res.statusCode = 500;
                                if (isServiceError(err)) {
                                    delete err.result.error!.origin;
                                    // delete err.result.error!.description;
                                    delete (err.result as any).params;
                                    (err.result as any).requestId = requestId;
                                    (err.result as any).instanceId = scope.instanceId;
                                    if (err.result.warnings) {
                                        // to secure sensitive info.
                                        err.result.warnings.forEach((warn: any) => {
                                            delete warn.origin;
                                        });
                                    }
                                    res.write(JSON.stringify(err.result));
                                } else {
                                    res.statusCode = 500;
                                    res.write(
                                        JSON.stringify({
                                            instanceId: scope.instanceId,
                                            requestId: scope.requestId,
                                            error: {
                                                code: 'Unknown',
                                            },
                                        }),
                                    );
                                }
                                res.end();
                                req.destroy();
                            }
                        });


                        req.on('error', (err) => {
                            console.error('REQUEST ERROR:', err);
                        });
                        
                        req.on('aborted', () => {
                            console.log('REQUEST ABORTED');
                        });

                        return 
                    } else {
                        const msg = await getRequestBody(req).then((body) => {
                            try {
                                return JSON.parse(body);
                            } catch {
                                throw new Error(`Invalid JSON body. url: ${url}. body: ${body}`);
                            }
                        });
                        params = msg.params;


                        if (trace) {
                            log(`[info] [server.handleRequest] request body parsed`);
                        }

                        const result = await service(params, scope);

                        if (trace) {
                            log(`[info] [server.handleRequest] service called successfully`);
                        }

                        if (result) {
                            (result as any).requestId = scope.requestId;
                            (result as any).instanceId = scope.instanceId;
                            if (result.error) {
                                // to secure sensitive info.
                                delete result.error.origin;
                            }
                            if (result.warnings) {
                                // to secure sensitive info.
                                result.warnings.forEach((warn: any) => {
                                    delete warn.origin;
                                });
                            }
                        }
                        res.statusCode = 200;
                        if (result) {
                            res.write(JSON.stringify(result));
                        } else {
                            res.write({});
                        }
                        if (trace) {
                            log(`[info] [server.handleRequest] result written`);
                        }
                        return res.end();
                    }
                } catch (err: any) {
                    console.error(`[error] ${JSON.stringify(err)}`, err.message, err.stack);
                    res.statusCode = 500;
                    if (isServiceError(err)) {
                        delete err.result.error!.origin;
                        // delete err.result.error!.description;
                        delete (err.result as any).params;
                        (err.result as any).requestId = requestId;
                        (err.result as any).instanceId = scope.instanceId;
                        if (err.result.warnings) {
                            // to secure sensitive info.
                            err.result.warnings.forEach((warn: any) => {
                                delete warn.origin;
                            });
                        }
                        res.write(JSON.stringify(err.result));
                    } else {
                        res.statusCode = 500;
                        res.write(
                            JSON.stringify({
                                instanceId: scope.instanceId,
                                requestId: scope.requestId,
                                error: {
                                    code: 'Unknown',
                                },
                            }),
                        );
                    }
                    res.end();
                    return;
                }
            } else if (customRoute) {
                await customRoute(req, res, scope);
                return;
            }
        } catch (err: any) {
            console.error(`ERROR: ${url}, ${JSON.stringify(err)}. Stack: ${err.stack}`);
            if (isServiceError(err)) {
                res.writeHead(500, {
                    'Content-Type': 'application/json',
                });
                delete (err.result as any).params;
                res.write(JSON.stringify(err.result));
            } else {
                res.statusCode = 500;
                res.write(err.message);
            }
            res.end();
            return;
        }

        res.write('Invalid URL');
        res.end();
    });

    return server;
};
