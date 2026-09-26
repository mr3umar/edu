import { PageE } from "../../entities/Page.js";

export const serviceName = 'createUpload';
export type Def = {
    Params: {
        bookUid: string;
        index: number;
        width: PageE["data"]["width"];
        height: PageE["data"]["height"];
        fileSize: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
