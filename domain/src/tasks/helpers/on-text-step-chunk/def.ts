import { StepE } from "../../../entities/Step.js";
import { TextStepOutputChunk } from "../../../entities/Task.js";

export const serviceName = 'onTextStepChunk';
export type Def = {
    Params: {
        taskUid: string, 
        conversationUid: string, 
        type: StepE["data"]["type"]
        chunk: TextStepOutputChunk
    };
    Data: {
    };
    ErrorCodes: never;
};
