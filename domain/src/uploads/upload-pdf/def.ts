
export const serviceName = 'uploadPdf';
export type Def = {
    Params: {
        fileId: string;
        fileName: string;
        fileSize: number;
        chunkIndex?: number;
        chunk?: any;
        completed?: boolean
    };
    Data: {
        uploadUid?: string;
        progressPercent: number;
        bookUid?: string;
    };
    ErrorCodes: never;
};
