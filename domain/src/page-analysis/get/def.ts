import { PageAnalysisM } from "../../entities/index.js";

export const serviceName = 'getPageAnalysis';
/**
 * Returns a specific book
 */
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        item: PageAnalysisM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};
