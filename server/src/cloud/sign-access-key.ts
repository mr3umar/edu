import { ENV_TARGET } from "../config.js";
import { AccessKeyData } from "./types.js";
import { Crypto } from "./crypto.js";
import { CLOUD_PRIVATE_KEY_PROD } from "./keys/prod.js";
import { CLOUD_PRIVATE_KEY_TEST, CLOUD_PUBLIC_KEY_TEST } from "./keys/test.js";

const crypto = new Crypto()

const iamInstIds = {
        "users": "users", 
        "apps": "apps", 
}
const iamId = iamInstIds[process.argv[2] as keyof typeof iamInstIds]
const ownerId = process.argv[3]
const instanceIds = process.argv[4]
if(!iamId || !ownerId){
        console.info(`Command usage: (${Object.keys(iamInstIds).join(", ")}) ownerId [instanceIds]`)
        process.exit();
}
const accessKey: AccessKeyData = {
        iamId,
        ownerId,
        instanceIds: []
}
if(instanceIds){
        accessKey.instanceIds = instanceIds.split(",")
}
const privateKey = ENV_TARGET == "PROD" ? CLOUD_PRIVATE_KEY_PROD : CLOUD_PRIVATE_KEY_TEST
const token = crypto.signPayload(JSON.stringify(accessKey), privateKey);
crypto.verifyPayload(token, CLOUD_PUBLIC_KEY_TEST)
console.info(`token: ${token}`)