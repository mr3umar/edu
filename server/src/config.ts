export const PORT = process.argv[2] || 9004;
export const ENV_TARGET = (process.env.ENV_TARGET ?? 'DEV') as 'PROD' | 'TEST' | 'DEV';
import https from 'node:https';
import * as fs from 'fs';


// console.log(`Target Env: ${ENV_TARGET}`);

// export const GORMIC_CLOUD_URL =
//     ENV_TARGET === 'PROD'
//         ? 'http://gormic-cloud-v1-1-internal-prod.prod.svc.cluster.local'
//         : ENV_TARGET === 'TEST'
//           ? 'http://gormic-cloud-v1-1-internal-test.default.svc.cluster.local'
//           : 'http://localhost:9003';


export const NODE_ID = 'server-1'
export const INSTANCE_ID = 'edu-ai'
export const SCOPE = {
        instanceId: INSTANCE_ID
}

export const MAX_INPUT_TOKENS = 250000;
export const USERS_IAM = "users"


export const httpOptions: https.ServerOptions = {
        key: fs.readFileSync('./certs/dev-key.pem'),
        cert: fs.readFileSync('./certs/dev-cert.pem'),
};