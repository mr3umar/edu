
export const serviceName = 'sendEmailOtp';
export type Def = {
    Params: {
        email: string;
    };
    Data: {
        token: string
    };
    ErrorCodes: never;
};
