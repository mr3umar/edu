import { TaskE } from "../../entities/Task.js";

export const serviceName = 'createTask';
export type Def = {
    Params: {
        taskGroupUid: string;
        predecessorUids?: string[];
        type: TaskE["data"]["type"]
        input: TaskE["data"]["input"]
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
