import { UploadM } from "../../entities/Upload.js";

export const serviceName = 'getUpload';
/**
 * Returns a specific book
 */
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        item: UploadM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};
