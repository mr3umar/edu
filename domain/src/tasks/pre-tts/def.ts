
export const serviceName = 'preTTS';
export type Def = {
    Params: { 
        taskUid: string, 
        // language: string;
        // text: string
    };
    Data: {
        output: {
            text: string;
            cc: string;
        }
        // text: string;
        // cc: string;
    };
    ErrorCodes: never;
};
