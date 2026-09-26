import { UserM } from "../../entities/User.js";

export const serviceName = 'signIn';
export type Def = {
    Params: {
        email: string;
        password: string;
    };
    Data: {
        user: UserM;
        emailVerified: boolean;
        accessToken: string
        /**
         * expiresIn in seconds
         */
        expiresIn: number
        refreshToken: string    
    };
    ErrorCodes: 'NOT_FOUND' | 'INCORRECT_CREDENTIAL';
};
