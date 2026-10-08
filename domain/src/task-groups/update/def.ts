import { TaskGroupE } from "../../entities/TaskGroup.js";

export const serviceName = 'updateTaskGroup';
export type Def = {
    Params: {
        uid: string, 
        status: TaskGroupE["data"]["status"]
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};
