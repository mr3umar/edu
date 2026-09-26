export const serviceName = 'archiveBook';
/**
 * Archives a specific user.
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
