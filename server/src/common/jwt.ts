import * as jwt from 'jsonwebtoken';
import { Context } from '@dija/gormic-service-kit-domain';

export const createJWT = (secret: string) => {
    const encrypt: Context.Encrypt = async (scope, data) => {
        const token = ((jwt as any).default as typeof jwt).sign(data, secret);

        return token;
    };
    const decrypt: Context.Decrypt = async (scope, token) => {
        const data = ((jwt as any).default as typeof jwt).verify(token, secret);

        return data as any;
    };
    return {
        encrypt,
        decrypt,
    };
};
