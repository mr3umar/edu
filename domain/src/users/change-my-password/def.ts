
export const serviceName = 'changeMyPassword';
export type Def = {
    Params: {
        oldPassword: string;
        newPassword: string;
    };
    Data: {
        succeed: boolean
    };
    ErrorCodes: never;
};
