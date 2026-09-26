import { BookE } from "../../entities/Book.js";

export const serviceName = 'createBook';
export type Def = {
    Params: {
        id?: string;
        title?: BookE["data"]["title"];
        language?: BookE["data"]["language"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
