
export const serviceName = 'cancelTaskGroup';
export type Def = {
    Params: {
        uid: string, 
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};
