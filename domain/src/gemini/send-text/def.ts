import { TaskE, TextStepsOutput } from "../../entities/Task.js";

export const serviceName = 'geminiSendText';
export type Def = {
    Params: {
        taskUid: string;
        // instructions?: string, 
        // mode?: 'normal' | 'options'
    };
    Data: {
        output: TextStepsOutput;
    };
    ErrorCodes: never;
};
