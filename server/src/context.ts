import { createCacheRepo, Fetch, Service } from 'edu-ai-domain';
// import ShortUniqueId from 'short-unique-id';
import { ENV_TARGET } from './config.js';
import { decrypt, encrypt } from './common/jwt-encrypt.js';
import { createServiceFetch } from './common/fetch.js';
// const geenrateShort = new ShortUniqueId({
//     length: 8,
//     dictionary: "alphanum_lower"
// })

export const createContext = (depends: {  }, fetch: Fetch) => {
    const TempData: any = {};


    
    // const callService: Context.CallService = async (scope, instanceId, serviceName, params) => {

    //     const app = (await getApp(scope, instanceId))(serviceName)()
    //     return (await app(params, scope)) as ServiceResult<any>
    // }
    
    const context = {
        setTemp: (key: string, value: any, life: number) => {
            TempData[key] = {
                value,
                expireTime: new Date().getTime() + life * 1000,
            };
            return Promise.resolve();
        },
        getTemp: <T>(key: string) => {
            const value = TempData[key] ? TempData[key].value : undefined;
            return Promise.resolve(value);
        },
        ENV: ENV_TARGET as 'PROD',
        fetch: createServiceFetch(),
        decrypt,
        encrypt,
        // getConfig: async (scope: Scope) => {
        //     if (!scope.instanceId) {
        //         throw new Error(`Missing instanceId in scope`);
        //     }
        //     const instanceRes = await depends.getInstance(
        //         {
        //             id: scope.instanceId,
        //         },
        //         scope,
        //     );
        //     return instanceRes.data.instance.config as Config;
        // },
        getUserId: async (scope: any) => {
            return scope.accessKeyData?.ownerId
        },
        // getShortId: async (scope: any, key: string, max: number) => {
        //     return geenrateShort.rnd()
        // },
        getEnvTarget: () => ENV_TARGET,
        cacheRepo: createCacheRepo(),
        // callService
    };

    setInterval(() => {
        for (const k in TempData) {
            if (TempData[k].expireTime < new Date().getTime()) {
                delete TempData[k];
            }
        }
    }, 1000 * 60 * 60);

    return context;
};
