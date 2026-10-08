
export const serviceName = 'processTextStep';
export type Def = {
    Params: {
        taskUid: string, 
        // type: StepE["data"]["type"]
        // chunk: StepE["data"]["chunk"]
    };
    Data: {
            output: {
                textToSay?: string,
                html?: string
            };
    };
    ErrorCodes: never;
};
