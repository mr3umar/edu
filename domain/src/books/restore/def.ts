export const serviceName = 'restoreBook';

/**
 * Restores an archived user.
 */
export type Def = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};
