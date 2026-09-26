import { BookE } from "../../entities/Book.js";

export const serviceName = 'analyzeBook';
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        success: boolean
    };
    ErrorCodes: never;
};
