export const serviceName = 'deleteBook';
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: 'UNAUTHORIZED';
    WarningCodes: never;
};
