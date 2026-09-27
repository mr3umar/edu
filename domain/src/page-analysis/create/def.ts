import { PageAnalysisE } from "../../entities/PageAnalysis.js";

export const serviceName = 'createPageAnalysis';
export type Def = {
    Params: {
        bookUid: string;
        pageIndex: number;
        parts: PageAnalysisE["data"]["parts"];
        words: PageAnalysisE["data"]["words"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
