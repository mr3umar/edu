import { Context } from '../context.js';
import { Scope } from '../types.js';

export const createCacheRepo = () => {
    const TempData: {
        [key: string]: {
            value: any;
            expireTime?: number;
        };
    } = {};

    const repo: Context.CacheRepo = {
        set: async (scope: Scope, key: string, value: any, ttl?: number) => {
            TempData[key] = {
                value,
                expireTime: ttl ? new Date().getTime() + ttl : undefined,
            };
        },
        get: async <T>(scope: Scope, key: string, fallback?: boolean) => {
            const obj = TempData[key] ? TempData[key] : undefined;

            if (!obj) {
                return;
            }
            if (fallback) {
                return obj;
            }
            if (obj.expireTime && new Date().getTime() > obj.expireTime) {
                return;
            }
            return obj.value;
        },
    };

    return repo;
};
