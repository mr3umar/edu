
export const serviceName = 'uploadImageToConversation';
export type Def = {
    Params: {
        conversationUid: string;
        fileId: string;
        fileName: string;
        fileSize: number;
        chunkIndex?: number;
        chunk?: any;
        completed?: boolean;
    };
    Data: {
        uploadUid?: string;
        progressPercent: number;
    };
    ErrorCodes: never;
};
