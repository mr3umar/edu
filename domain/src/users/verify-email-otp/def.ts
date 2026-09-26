
export const serviceName = 'verifyEmailOtp';
export type Def = {
    Params: {
        email: string;
        token: string;
        otp: string;
    };
    Data: {
        succeed: boolean
    };
    ErrorCodes: never;
};
