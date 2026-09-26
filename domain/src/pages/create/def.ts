import { PageE } from "../../entities/Page.js";

export const serviceName = 'createPage';
export type Def = {
    Params: {
        bookUid: string;
        pageIndex: number;
        width: PageE["data"]["width"];
        height: PageE["data"]["height"];
        fileSize: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
        sectionId?: PageE["data"]["sectionId"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
