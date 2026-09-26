
export const serviceName = 'resetPassword';
export type Def = {
    Params: {
        token: string;
        newPassword: string;
    };
    Data: {
        succeed: boolean
    };
    ErrorCodes: never;
};
