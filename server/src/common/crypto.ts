import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Context } from '@dija/gormic-service-kit-domain';

export class CryptoUtil {
    constructor(
        private signSecret: string,
        private encryptPassphrase: string,
    ) {}

    static generateKeys() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        return {
            privateKey,
            publicKey,
        };
    }

    static signPayload(payload: string, privateKey: string): string {
        return ((jwt as any).default as typeof jwt).sign(payload, privateKey, { algorithm: 'RS256' });
    }

    static verifyPayload(token: string, publicKey: string) {
        try {
            return ((jwt as any).default as typeof jwt).verify(token, publicKey, { algorithms: ['RS256'] }) as any;
        } catch (e) {
            console.error('Verification failed:', e);
            return null;
        }
    }
    static encryptPayload(payload: any, encryptionKey: string) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
        let encrypted = cipher.update(payload, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    static decryptPayload(encryptedPayload: string, encryptionKey: string) {
        const parts = encryptedPayload.split(':');
        const iv = Buffer.from(parts.shift()!, 'hex');
        const encryptedText = parts.join(':'); // Encrypted hex string
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8'); // hex as input, utf8 as output
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    static encryptWithPassphraseAndSalt(plainText: string, passphrase: string) {
        const salt = crypto.randomBytes(16); // 16-byte salt
        const iv = crypto.randomBytes(16); // Initialization vector (IV)

        // Derive a key from the passphrase and salt using PBKDF2
        const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256'); // AES-256 uses 32-byte key

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Combine salt, iv, and encrypted data into one string
        const encryptedData = salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted;

        return encryptedData;
    }
    static decryptWithPassphraseAndSalt(encryptedData: string, passphrase: string) {
        const parts = encryptedData.split(':');
        const salt = Buffer.from(parts[0], 'hex'); // Extract salt
        const iv = Buffer.from(parts[1], 'hex'); // Extract IV
        const encryptedText = parts[2]; // The actual encrypted text

        // Derive the key from the passphrase and the extracted salt
        const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
    static signWithSecret(data: string, secret: string, options: { expiresIn?: number }) {
        return ((jwt as any).default as typeof jwt).sign(
            { data }, // your encrypted data in the JWT payload
            secret, // secret key used to sign the JWT
            { expiresIn: options.expiresIn }, // set expiration for the token
        );
    }
    static verifyWithSecret(data: string, secret: string) {
        return ((jwt as any).default as typeof jwt).verify(data, secret) as {
            data: any;
            iat: number;
            exp: number;
        };
    }

    encrypt: Context.Encrypt = async (scope, data, options) => {
        const encrypted = CryptoUtil.encryptWithPassphraseAndSalt(JSON.stringify(data), this.encryptPassphrase);
        return CryptoUtil.signWithSecret(encrypted, this.signSecret, options);
    };
    decrypt: Context.Decrypt = async (scope, data) => {
        try {
            const verified = CryptoUtil.verifyWithSecret(data, this.signSecret);
            const decrypted = CryptoUtil.decryptWithPassphraseAndSalt(verified.data, this.encryptPassphrase);
            return {
                data: JSON.parse(decrypted),
                expired: false,
            };
        } catch (err: any) {
            if (err.constructor?.name == 'TokenExpiredError') {
                return { expired: true };
            }
            throw err;
        }
    };
}
