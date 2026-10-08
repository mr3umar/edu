import { TaskE } from "../../entities/Task.js";

export const serviceName = 'openaiTTSPrepare';
export type Def = {
    Params: {
        taskUid: string;
        // instructions?: string, 
        // mode?: 'normal' | 'options'
    };
    Data: {
        output: {
            text: string
        }
    };
    ErrorCodes: never;
};
