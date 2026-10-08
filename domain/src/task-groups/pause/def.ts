
export const serviceName = 'pauseTaskGroup';
export type Def = {
    Params: {
        uid: string, 
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};
