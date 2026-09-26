
export const serviceName = 'refreshAccessToken';
export type Def = {
    Params: {
        refreshToken: string;
    };
    Data: {
        accessToken: string
        /**
         * expiresIn in seconds
         */
        expiresIn: number
    };
    ErrorCodes: never;
};
