import { UserM } from "../../entities/User.js";
import { GetUser } from "../get/index.js";

export const serviceName = 'getCurrentUser';
export type Def = {
    Params: {
        
    };
    Data: GetUser["Data"]
    ErrorCodes: 'MISSING_TOKEN';
};
