import { UserM } from "../../entities/User.js";

export const serviceName = 'getUserByEmail';
export type Def = {
    Params: {
        email: string;
    };
    Data: {
        user: UserM;
    };
    ErrorCodes: 'NOT_FOUND';
};
