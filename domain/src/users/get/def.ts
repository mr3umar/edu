import { UserM } from "../../entities/User.js";

export const serviceName = 'getUser';
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        user: UserM;
        emailVerified: boolean;
    };
    ErrorCodes: never;
};
