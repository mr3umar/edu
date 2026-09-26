
export const serviceName = 'sendResetPassword';
export type Def = {
    Params: {
        email: string;
    };
    Data: {
        succeed: boolean
    };
    ErrorCodes: never;
};
