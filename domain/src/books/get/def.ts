import { BookM } from "../../entities/index.js";

export const serviceName = 'getBook';
/**
 * Returns a specific book
 */
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        item: BookM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};
