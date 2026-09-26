import { BookE } from "../../entities/Book.js";
import { PageE } from "../../entities/Page.js";

export const serviceName = 'updatePage';
export type Def = {
    Params: {
        uid: string;
        width?: PageE["data"]["width"];
        height?: PageE["data"]["height"];
        fileSize?: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
        sectionId?: PageE["data"]["sectionId"];
        textExtracted?: PageE["data"]["textExtracted"];
    };
    Data: {
        success: boolean
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};
