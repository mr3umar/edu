import { TaskE } from "../../entities/Task.js";

export const serviceName = 'grokTTS';
export type Def = {
    Params: {
        taskUid: string;
        // instructions?: string, 
        // mode?: 'normal' | 'options'
    };
    Data: {
        output: TaskE["data"]["output"];
    };
    ErrorCodes: never;
};
