import { UserM } from "../../entities/User.js";

export const serviceName = 'signUp';
export type Def = {
    Params: {
        email: string;
        password: string;
    };
    Data: {
        user: UserM;
        emailVerified: boolean;
    };
    ErrorCodes: 'ALREADY_REGISTERED';
};
