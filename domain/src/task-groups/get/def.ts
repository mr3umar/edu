import { TaskGroupM } from "../../entities/TaskGroup.js";

export const serviceName = 'getTaskGroup';
/**
 * Returns a specific book
 */
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        item: TaskGroupM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};
