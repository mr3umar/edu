import { StepE } from "../../entities/Step.js";

export const serviceName = 'processOutput';
export type Def = {
    Params: {
        taskUid: string, 
        type: StepE["data"]["type"]
        data: StepE["data"]["chunk"]
    };
    Data: {
    };
    ErrorCodes: never;
};
