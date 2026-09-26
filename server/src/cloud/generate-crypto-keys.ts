import { Crypto } from "./crypto.js";

const keys = Crypto.generateKeys()

console.info(`Private Key:`)
console.info(keys.privateKey)

console.info(`Public Key:`)
console.info(keys.publicKey)