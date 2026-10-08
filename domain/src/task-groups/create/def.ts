import { TaskE } from "../../entities/Task.js";
import { TaskGroupE } from "../../entities/TaskGroup.js";

export const serviceName = 'createTaskGroup';
export type Def = {
    Params: {
        conversationUid: string;
        clientRequestId: TaskGroupE["data"]["clientRequestId"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
