import { TaskE } from "../../entities/Task.js";

export const serviceName = 'startTask';
export type Def = {
    Params: {
        taskUid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: 'UNSUPPORTED_TASK_TYPE';
};
