import { Context } from '../context.js';
import { Deferred } from './functions/deferred.js';
import { AddLog, Service, ServiceErrorImpl, ServiceOptions, ServiceResult } from '../types.js';

export type ServicesT = { [key: string]: (context: any, services: any) => Service<any> };
export type CacheRule<ServiceNameT> = {
    cache: ServiceOptions['cache'];
    services: ServiceNameT[];
    repo: Context.CacheRepo;
};
export const initServices = <T extends ServicesT>(
    appId: string,
    services: T,
    opts: {
        addLog?: Service<AddLog>;
        cacheRepo?: Context.CacheRepo;
        cacheRules?: CacheRule<string>[];
    },
) => {
    const servicesPrv: any = {};
    const cacheDefers: { [key: string]: Deferred<any> } = {};

    type ContextParamIntersection = {
        [K in keyof T]: (x: Parameters<T[K]>['0']) => void;
    }[keyof T] extends (x: infer I) => void
        ? I
        : never;

    type ParamIntersection = {
        [K in keyof T]: (x: Parameters<T[K]>['1']) => void;
    }[keyof T] extends (x: infer I) => void
        ? I
        : never;
    type ParamIntersection2 = {
        [K in keyof T]: ReturnType<T[K]>;
    };

    type ParamIntersectionWithoutSelf = Omit<ParamIntersection, keyof T> & Partial<T>;

    return (context: ContextParamIntersection, depends: ParamIntersectionWithoutSelf) => {
        const initService = <ServiceT extends { Params: any; Data: any }>(
            getService: () => Service<any>,
            name: string,
        ) => {
            const cacheRule = opts.cacheRules?.find((rule) => rule.services.includes(name));
            const cache = cacheRule?.cache;

            return async (params: ServiceT['Params'], scope: any, options?: ServiceOptions) => {
                if (!servicesPrv[name]) {
                    const service = getService();
                    servicesPrv[name] = service;
                }
                
                if(!scope.stack){
                    scope.stack = []
                }
                scope.stack.push(name)

                const cacheOpts: NonNullable<ServiceOptions['cache']> = scope.cache ?? options?.cache ?? cache; // backword comp.
                let cacheLocalKey = cacheOpts?.key
                if (cacheOpts) {
                    if (!cacheLocalKey && cacheOpts?.keyParam) {
                        cacheLocalKey = `${params[cacheOpts.keyParam]}`;
                    }
                }
                const cacheK = cacheOpts ? `${scope?.instanceId}-${name}-${cacheLocalKey}` : undefined;
                const fallback = cacheOpts?.fallback;
                const cacheRepo = cacheRule?.repo ?? opts.cacheRepo
                if (cacheK && !cacheRepo) {
                    console.warn(`[service-kit] cacheRepo not defined. service: ${name}, instance: ${scope?.instanceId}`);
                }
                if (cacheK && cacheRepo) {
                    delete scope?.cache;
                    delete options?.cache;
                    let cached = await cacheRepo.get<any>(scope, cacheK);
                    if (!cached && cacheDefers[cacheK]) {
                        cached = await cacheDefers[cacheK].promise;
                    }
                    if (cached) {
                        if (cached.error) {
                            throw new ServiceErrorImpl(cached, params);
                        } else if (cached instanceof Error) {
                            throw cached;
                        }
                        return cached;
                    }
                    cacheDefers[cacheK] = new Deferred();
                    cacheDefers[cacheK].promise.catch(err => {}) // to catch unhandled exception if no other request waiting
                }

                try {
                    const result: ServiceResult<ServiceT> = await servicesPrv[name](params, scope);

                    if (cacheK && cacheRepo) {
                        await cacheRepo.set(scope, cacheK, result, cacheOpts.ttl);
                        cacheDefers[cacheK].resolve(result);
                        delete cacheDefers[cacheK];
                    }

                    if (opts.addLog)
                        await opts.addLog(
                            {
                                requestId: scope.requestId,
                                app: result.app,
                                service: result.service ? result.service : name,
                                params,
                                scope,
                                data: result.data,
                                error: result.error,
                                warnings: result.warnings,
                                info: result.info,
                            },
                            scope,
                        );

                    return result;
                } catch (err: any) {
                    if (cacheK && cacheRepo) {
                        if (fallback == 'last') {
                            const cached = await (cacheRepo.get as any)(cacheK, true);
                            if (cached) {
                                cacheDefers[cacheK].resolve(cached);
                                delete cacheDefers[cacheK];
                                return cached;
                            } else {
                                cacheDefers[cacheK].resolve(err);
                                delete cacheDefers[cacheK];
                                throw err;
                            }
                        } else {
                            if (
                                err.message.includes('503') ||
                                err.message.includes('ECONNREFUSED') ||
                                err.message.includes('408') ||
                                err.message.includes('timeout') ||
                                err.message.includes('Unknown') ||
                                err.message.includes('HTTPError')
                            ) {
                                // ignore caching
                            } else {
                                await cacheRepo.set(scope, cacheK, err, cacheOpts.ttl);
                            }
                            cacheDefers[cacheK].resolve(err);
                            delete cacheDefers[cacheK];
                            throw err;
                        }
                    }

                    if (opts.addLog)
                        await opts.addLog(
                            {
                                requestId: scope.requestId,
                                app: appId,
                                service: name,
                                params,
                                scope,
                                data: undefined,
                                error: err,
                                warnings: [],
                                info: [],
                            },
                            scope,
                        );
                    throw err;
                }
            };
        };

        const services3: any = {};
        for (const k in services) {
            services3[k] = initService(() => {
                const service = async (params: any, scope: any, options: any) => {
                    return services[k as keyof typeof services](context, { ...(depends as any), ...services3 })(
                        params,
                        scope,
                        options,
                    );
                };
                return service;
            }, k);
        }
        return services3 as ParamIntersection2;
    };
};
