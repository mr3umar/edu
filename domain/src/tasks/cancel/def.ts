
export const serviceName = 'cancelTask';
export type Def = {
    Params: {
        uid: string, 
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};
