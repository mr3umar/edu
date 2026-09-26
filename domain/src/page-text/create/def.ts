import { PageTextE } from "../../entities/PageText.js";

export const serviceName = 'createPageText';
export type Def = {
    Params: {
        bookUid: string;
        pageIndex: number;
        text: PageTextE["data"]["text"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
