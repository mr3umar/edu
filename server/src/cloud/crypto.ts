import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

export class Crypto {
    static generateKeys(){
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        return {
            privateKey,
            publicKey
        }
    }

    signPayload(payload: string, privateKey: string): string {
        return (jwt as any).default.sign(payload, privateKey, { algorithm: 'RS256' });
    }

    verifyPayload(token: string, publicKey: string) {
        try {
            return (jwt as any).default.verify(token, publicKey, { algorithms: ['RS256'] });
        } catch (e) {
            console.error('Verification failed:', e);
            return null;
        }
    }
}
