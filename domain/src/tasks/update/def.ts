import { TaskE } from "../../entities/Task.js";

export const serviceName = 'updateTask';
export type Def = {
    Params: {
        uid: string, 
        status?: TaskE["data"]["status"], 
        output?: TaskE["data"]["output"], 
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};
