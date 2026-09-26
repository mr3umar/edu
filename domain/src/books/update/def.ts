import { BookE } from "../../entities/Book.js";

export const serviceName = 'updateBook';
export type Def = {
    Params: {
        uid: string;
        title?: BookE["data"]["title"]
        language?: BookE["data"]["language"]
        pagesCount?: BookE["data"]["pagesCount"]
    };
    Data: {
        success: boolean
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};
