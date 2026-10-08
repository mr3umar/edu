import { UsageE } from "../../entities/Usage.js";

export const serviceName = 'createUsage';
export type Def = {
    Params: {
        model: UsageE["data"]["model"], 
        task: UsageE["data"]["task"], 
        type: UsageE["data"]["type"], 
        cost: UsageE["data"]["cost"],
        tokens?: UsageE["data"]["tokens"], 
        charactersCount?: UsageE["data"]["charactersCount"], 
        audioMin?: UsageE["data"]["audioMin"], 
        info?: UsageE["data"]["info"], 
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
