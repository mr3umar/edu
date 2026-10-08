import { TaskM } from "../../entities/Task.js";
import { TaskGroupM } from "../../entities/TaskGroup.js";

export const serviceName = 'getTask';
/**
 * Returns a specific book
 */
export type Def = {
    Params: {
        uid: string;
        include?: ("taskGroup" | "predecessors")[]
    };
    Data: {
        task: TaskM;
        taskGroup?: TaskGroupM,
        predecessors?: TaskM[],
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};
