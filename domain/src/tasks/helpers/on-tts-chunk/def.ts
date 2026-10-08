
export const serviceName = 'onTTSChunk';
export type Def = {
    Params: {
        taskUid: string, 
        chunkIndex: number, 
        chunk?: Buffer<ArrayBuffer>
        completed?: boolean
    };
    Data: {
    };
    ErrorCodes: never;
};
