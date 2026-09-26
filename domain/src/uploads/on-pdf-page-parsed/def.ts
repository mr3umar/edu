
export const serviceName = 'onPdfPageParsed';
export type Def = {
    Params: {
        uploadUid: string;
        pageIndex: number;
        width: number;
        height: number;
        fileSize: number;
    };
    Data: {
    };
    ErrorCodes: never;
};
