
export const serviceName = 'onPdfParsed';
export type Def = {
    Params: {
        uploadUid: string;
        title?: string;
        pagesCount: number;
    };
    Data: {
    };
    ErrorCodes: never;
};
