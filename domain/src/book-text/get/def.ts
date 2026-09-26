import { BookTextM } from "../../entities/BookText.js";
import { PageAnalysisM } from "../../entities/index.js";

export const serviceName = 'getBookText';
/**
 * Returns a specific book
 */
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        item: BookTextM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};
