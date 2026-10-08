import * as _dija_gormic_service_kit_domain from '@dija/gormic-service-kit-domain';
import { ListQueryParams as ListQueryParams$1 } from '@dija/gormic-service-kit-domain';
import * as _gormic_utils_public from '@gormic/utils-public';
import * as _dija_taj_data_services from '@dija/taj-data-services';
import { ItemPK, MetaData } from '@dija/taj-data-services';
import OpenAI from 'openai';
import * as _dija_gormic_cloud_public from '@dija/gormic-cloud-public';

type Def$1e = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: 'UNAUTHORIZED';
    WarningCodes: never;
};

/**
 * Restores an archived user.
 */
type Def$1d = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

/**
 * Archives a specific user.
 */
type Def$1c = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

type Errors = 'UnknownError' | 'ParamMissingError' | 'NotFoundError' | 'InvalidOTP' | 'InvalidMobile' | 'HTTPError' | 'CancelReservation' | 'GetReservation';
type ServiceError<ServiceDefT extends ServiceDef, ServerErrorT = any> = {
    code: 'UnknownError' | 'ParamMissingError' | 'InvalidParamError' | 'ServerError' | 'Locked' | ServiceDefT['ErrorCodes'] | keyof ServerErrorT;
    description?: string;
    details?: string;
    missingParams?: ('*' | keyof ServiceDefT['Params'])[];
    origin?: any;
    serverError?: ServerErrorT;
} & ServiceDefT["Errors"];
declare class HTTPError extends Error implements ServiceError<any> {
    code: number;
    description: string;
    origin: any;
    service: string;
    type: Errors;
    constructor(code: number, description: string, origin: any);
}
type Service<ServiceT extends {
    Params: any;
    Data: any;
    ErrorCodes?: any;
    WarningCodes?: any;
}, ServerErrorT = any, ScopeT = any> = (params: ServiceT['Params'], scope: ScopeT, options?: ServiceOptions) => Promise<ServiceResult<ServiceT, ServerErrorT>>;
type ServiceOptions = {
    cache?: {
        key?: string;
        keyParam?: string;
        fallback: 'last';
        ttl: number;
    };
};
type ServiceResultOld = {
    app: string;
    service: string;
};
type ServiceResult<ServiceT extends {
    Params: any;
    Data: any;
    ErrorCodes?: any;
    WarningCodes?: any;
}, ServerErrorT = any> = {
    app: string;
    service: string;
    data: ServiceT['Data'];
    requestId?: string;
    error?: {
        code: 'UnknownError' | 'ParamMissingError' | 'ServerError' | 'Locked' | ServiceT['ErrorCodes'];
        description?: string;
        missingParams?: ('*' | keyof ServiceT['Params'])[];
        origin?: any;
        serverError?: ServerErrorT;
    };
    warnings: ServiceWarning<ServiceT>[];
    info?: {
        description?: string;
        data?: any;
    }[];
};
type Fetch = <T>(options: {
    url?: string;
    method: 'POST' | 'GET' | 'PUT' | 'PATCH';
    path: string;
    headers: {
        [key: string]: string;
    };
    body?: any;
    returnType?: 'string' | 'buffer' | 'base64';
}) => Promise<{
    statusCode?: number;
    data?: T;
    error?: HTTPError;
}>;
type ServiceDef = {
    Params: any;
    Data: any;
    ErrorCodes?: any;
    WarningCodes?: any;
    Errors?: any;
};
type ServiceWarning<ServiceDefT extends ServiceDef, ServerErrorT = any> = {
    code: 'Unknown' | ServiceDefT['WarningCodes'];
    description?: string;
    origin?: any;
};
declare class ServiceErrorImpl<ServiceDefT extends ServiceDef, T2> extends Error {
    result: ServiceResult<ServiceDefT, T2>;
    params?: any | undefined;
    constructor(result: ServiceResult<ServiceDefT, T2>, params?: any | undefined);
}
declare function isServiceError<ServiceDefT extends ServiceDef>(error: ServiceErrorImpl<ServiceDefT, any> | Error): error is ServiceErrorImpl<ServiceDefT, any>;
declare function isServiceResult<ServiceDefT extends ServiceDef>(result: ServiceResult<ServiceDefT, any> | Error): result is ServiceResult<ServiceDefT, any>;
type AddLog = {
    Params: {
        app: string;
        service: string;
        requestId?: string;
        scope?: any;
        params?: any;
        data?: ServiceResult<any>['data'];
        error?: ServiceResult<any>['error'];
        warnings?: ServiceResult<any>['warnings'];
        info?: ServiceResult<any>['info'];
    };
    Data: {
        success: boolean;
    };
    ErrorCodes: never;
};
type ListQueryParams<TFilter extends Record<string, string | number | string[]>, TSort extends string> = {
    offset?: string;
    limit?: number;
    filter?: TFilter;
    sortBy?: TSort;
    sort?: 'ASC' | 'DESC';
};
type ListQueryResult<TFilter extends Record<string, string | number | string[]>, TSort extends string> = ListQueryParams<TFilter, TSort> & {
    total?: number;
};
type Scope = Record<string, any>;
type ExcelBook = {
    addWorksheet: (name: string, options?: {
        pageSetup: {
            paperSize: 9;
            orientation: "landscape" | "portrait";
        };
    }) => ExcelWorksheet;
    generateFile: () => Promise<ArrayBuffer>;
};
type ExcelWorksheet = {
    getRow: (index: number) => ExcelRow;
    getColumn: (index: number) => ExcelColumn;
    eachRow: (cb: (row: ExcelRow, rowNumber: number) => void) => void;
    addImage: (image: string, options: {
        tl: {
            col: number;
            row: number;
        };
        ext: {
            width: number;
            height: number;
        };
    }) => void;
    mergeCells: (top: number, left: number, bottom: number, right: number) => void;
};
type ExcelRow = {
    setValues: (values: string[]) => void;
    getFont: () => {
        bold?: boolean;
        size?: number;
    };
    setFont: (options: {
        bold?: boolean;
        size?: number;
    }) => void;
    setHeight: (value: number) => void;
    getCell: (letter: string) => ExcelCell;
    eachCell: (cb: (cell: ExcelCell, columnNumber: number) => void) => void;
};
type ExcelColumn = {
    setWidth: (value: number) => void;
};
type ExcelCell = {
    setValue: (value: any) => void;
    setBorder: (options: {
        top?: ExcelBorderStyle;
        bottom?: ExcelBorderStyle;
    }) => void;
    setAlignment: (options: {
        wrapText?: true;
        horizontal?: 'left' | 'center' | 'right' | 'fill' | 'justify' | 'centerContinuous' | 'distributed';
        vertical?: 'top' | 'middle' | 'bottom' | 'distributed' | 'justify';
    }) => void;
    setFill: (options: {
        type: 'pattern';
        pattern: 'solid';
        fgColor?: string;
        bgColor?: string;
    }) => void;
    setColor: (value: string) => void;
};
type ExcelBorderStyle = {
    style?: 'thin' | 'medium' | 'thick';
    color?: {
        argb: string;
    };
};

type Def$1b = {
    Params: {
        uid: string;
    };
    Data: {
        success: boolean;
    };
    ErrorCodes: never;
};

type PageE = {
    pk: ItemPK;
    data: {
        pageNumber?: string;
        width: number;
        height: number;
        fileSize: number;
        sectionId?: string;
        textExtracted?: boolean;
    };
    meta: MetaData;
    links: {};
};
type PageM = PageE['data'] & PageE['meta'] & {
    uid: string;
    id: string;
    index: number;
    imageUrl: string;
};
declare const mapPage: (entity: PageE) => PageM;
declare const PageId: {
    parse: (uid: string) => {
        bookUid: string;
        pageIndex: number;
    };
    toUid: (bookUid: string, index: number) => string;
};

type SectionE = {
    pk: ItemPK;
    data: {
        title?: string;
    };
    meta: MetaData;
    links: {};
};
type SectionM = SectionE['data'] & SectionE['meta'] & {
    uid: string;
    id: string;
    index: number;
};

type BookE = {
    pk: ItemPK;
    data: {
        title?: string;
        language?: 'en' | 'ar';
        pagesCount?: number;
        archivedAt?: string | null;
        archivedBy?: string | null;
        archivedVia?: string | null;
    };
    meta: MetaData;
    links: {
        user: ItemPK;
        pdf?: ItemPK;
    };
    childs: {
        sections: SectionE[];
        pages: PageE[];
    };
};
declare enum BookLinkKeys {
    pdf = "pdf",
    user = "user"
}
declare enum BookChildsKeys {
    sections = "sections",
    pages = "pages"
}
type BookM = BookE['data'] & BookE['meta'] & {
    uid: string;
    userUid: string;
    pdfUploadUid?: string;
    sections: SectionM[];
    pages: PageM[];
    thumbnailUrl: string;
    status: 'parsing' | 'analyzing' | 'finalizing' | 'completed';
    /**
     * out of 100
     */
    statusProgress: number;
};
declare const STATUS_PORTION: {
    uploading: number;
    parsing: number;
    extracting: number;
    analyzing: number;
};
declare const mapBook: (item: BookE) => BookM;

type PageAnalysisE = {
    pk: ItemPK;
    data: {
        parts: {
            id: string;
            type: "question" | "question_group";
            content: string;
            parentId?: string;
            coordinates: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            transformedText?: {
                short: string;
                full: string;
            };
        }[];
        words: {
            id: string;
            partId: string;
            text: string;
            x?: number;
            y?: number;
            width: number;
            height: number;
        }[];
    };
    meta: MetaData;
    links: {};
};
type PageAnalysisM = PageAnalysisE['data'] & PageAnalysisE['meta'] & {
    uid: string;
};
declare const mapPageAnalysis: (entity: PageAnalysisE) => PageAnalysisM;

declare namespace Context {
    type GetEnvTarget = (scope: Scope) => 'PROD' | 'TEST' | 'DEV';
    type GetUserId = (scope: Scope) => Promise<string | undefined>;
    type GetClientIamId = (scope: any) => Promise<string>;
    type GetClientUserId = (scope: any) => Promise<string>;
    type getClientLanguage = (scope: any) => Promise<string>;
    type GetSource = (scope: any) => Promise<string | undefined>;
    type Encrypt = (scope: any, data: Record<string, any>, options: {
        expiresIn?: number;
    }) => Promise<string>;
    type Decrypt = <T>(scope: any, token: string) => Promise<{
        data?: T;
        expired: boolean;
    }>;
    type CacheRepo = {
        set: (scope: Scope, key: string, value: any, ttl: number) => Promise<void>;
        get: <T>(scope: Scope, key: string) => Promise<T>;
    };
    type CreateExcelWorkbook = (scope: any) => ExcelBook;
    type GetIAMInstanceId = (scope: any) => Promise<string>;
    type CallService = (scope: any, instanceId: string, serviceName: string, params: ServiceDef["Params"]) => Promise<ServiceResult<ServiceDef>>;
    type AppendFile = (scope: any, type: "pdf" | 'conv-uploaded-image', fileId: string, fileName: string, fileSize: number, isCompleted: boolean, chunkIndex?: number, data?: Buffer) => Promise<void>;
    type PdfToImages = (scope: any, fileId: string) => Promise<void>;
    type extractText = (scope: any, bookUid: string, pageIndex: number) => Promise<string>;
    type generateBookStructure = (scope: any, pageText: string[]) => Promise<{
        language: BookE["data"]["language"];
        bookTitle: string;
        sections: {
            sectionIndex: number;
            title: string;
        }[];
        pages: {
            pageIndex: number;
            sectionIndex: number;
        }[];
    }>;
    type analyzePage = (scope: any, bookUid: string, pageIndex: number, pageWidth: number, pageHight: number) => Promise<{
        parts: PageAnalysisE["data"]["parts"];
        words: PageAnalysisE["data"]["words"];
    }>;
    type sendToClient = (scope: any, data: Record<string, any>) => Promise<void>;
    type getOpenaiSession = (scope: any) => Promise<OpenAI>;
    type getPageImageBase64 = (scope: any, bookUid: string, pageIndex: number) => Promise<string>;
    type startTask = (scope: any, taskUid: string) => Promise<void>;
    type cancelTask = (scope: any, taskUid: string) => Promise<void>;
    type pauseTaskGroup = (scope: any, taskGroupUid: string) => Promise<void>;
    type resumeTaskGroup = (scope: any, taskGroupUid: string) => Promise<void>;
    type getTaskAbortContoller = (scope: any, taskUid: string) => Promise<AbortController>;
}

/**
 * Lists all journeys for a specific customer
 */
type Def$1a = {
    Params: {
        userUid: string;
        query?: ListQueryParams$1<never, never>;
    };
    Data: {
        items: BookM[];
        next?: string;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

type ListBooks = Def$1a;
declare const listBooks: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
    };
}) => (params: {
    userUid: string;
    query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1a, any>>;

/**
 * Lists all journeys for a specific customer
 */
type Def$19 = {
    Params: {
        query?: ListQueryParams$1<never, never>;
    };
    Data: ListBooks["Data"];
    ErrorCodes: never;
    WarningCodes: never;
};

type Def$18 = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

type UserE = {
    pk: ItemPK;
    data: {
        name?: string;
        gender?: 'm' | 'f';
        /**
         * format YYYY-MM-DD
         */
        birthdate?: string;
        preferedLang?: 'ar' | 'en';
    };
    meta: MetaData;
    links: {
        email?: ItemPK;
    };
    childs: {};
};
declare enum UserLinkKeys {
    email = "email"
}
declare enum UserChildsKeys {
}
type UserM = UserE['data'] & UserE['meta'] & {
    uid: string;
    email?: string;
};
declare const mapUser: (item: UserE) => UserM;

/**
 * Returns a specific book
 */
type Def$17 = {
    Params: {
        uid: string;
    };
    Data: {
        item: BookM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$16 = {
    Params: {
        uid: string;
        title?: BookE["data"]["title"];
        language?: BookE["data"]["language"];
        pagesCount?: BookE["data"]["pagesCount"];
    };
    Data: {
        success: boolean;
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};

type Def$15 = {
    Params: {
        id?: string;
        title?: BookE["data"]["title"];
        language?: BookE["data"]["language"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type Def$14 = {
    Params: {
        uid: string;
    };
    Data: {
        pageAnalysisUid: string;
    };
    ErrorCodes: never;
};

type Def$13 = {
    Params: {
        uid: string;
        width?: PageE["data"]["width"];
        height?: PageE["data"]["height"];
        fileSize?: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
        sectionId?: PageE["data"]["sectionId"];
        textExtracted?: PageE["data"]["textExtracted"];
    };
    Data: {
        success: boolean;
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};

type Def$12 = {
    Params: {
        bookUid: string;
        pageIndex: number;
        width: PageE["data"]["width"];
        height: PageE["data"]["height"];
        fileSize: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
        sectionId?: PageE["data"]["sectionId"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type Def$11 = {
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

type Def$10 = {
    Params: {
        uploadUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$$ = {
    Params: {
        uploadUid: string;
        pageIndex: number;
        width: number;
        height: number;
        fileSize: number;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$_ = {
    Params: {
        uploadUid: string;
        title?: string;
        pagesCount: number;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$Z = {
    Params: {
        bookUid: string;
        uploadUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$Y = {
    Params: {
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
        bookUid?: string;
    };
    ErrorCodes: never;
};

type UploadE = {
    pk: ItemPK;
    data: {
        fileName: string;
        size: string;
    };
    meta: MetaData;
    links: {
        book?: ItemPK;
    };
};
type UploadM = UploadE['data'] & UploadE['meta'] & {
    uid: string;
    bookUid?: string;
};

/**
 * Returns a specific book
 */
type Def$X = {
    Params: {
        uid: string;
    };
    Data: {
        item: UploadM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$W = {
    Params: {
        bookUid: string;
        index: number;
        width: PageE["data"]["width"];
        height: PageE["data"]["height"];
        fileSize: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type Def$V = {
    Params: {
        query?: ListQueryParams$1<never, never>;
    };
    Data: {
        items: UserM[];
        next?: string;
    };
    ErrorCodes: never;
};

type Def$U = {
    Params: {
        uid: string;
        name?: UserE["data"]["gender"];
        gender?: UserE["data"]["gender"];
        birthdate?: UserE["data"]["birthdate"];
        preferedLang?: UserE["data"]["preferedLang"];
    };
    Data: {
        success: boolean;
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};

type UpdateUser = Def$U;
declare const updateUser: (context: {}, depends: {
    tajData: {
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
    };
}) => (params: {
    uid: string;
    name?: UserE["data"]["gender"];
    gender?: UserE["data"]["gender"];
    birthdate?: UserE["data"]["birthdate"];
    preferedLang?: UserE["data"]["preferedLang"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$U, any>>;

type Def$T = {
    Params: {
        name?: UserE["data"]["gender"];
        gender?: UserE["data"]["gender"];
        birthdate?: UserE["data"]["birthdate"];
        preferedLang?: UserE["data"]["preferedLang"];
    };
    Data: UpdateUser["Data"];
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};

type Def$S = {
    Params: {
        oldPassword: string;
        newPassword: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$R = {
    Params: {
        token: string;
        newPassword: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$Q = {
    Params: {
        email: string;
        token: string;
        otp: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$P = {
    Params: {
        email: string;
    };
    Data: {
        token: string;
    };
    ErrorCodes: never;
};

type Def$O = {
    Params: {
        email: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$N = {
    Params: {
        refreshToken: string;
    };
    Data: {
        accessToken: string;
        /**
         * expiresIn in seconds
         */
        expiresIn: number;
    };
    ErrorCodes: never;
};

type Def$M = {
    Params: {
        uid: string;
    };
    Data: {
        user: UserM;
        emailVerified: boolean;
    };
    ErrorCodes: never;
};

type GetUser = Def$M;
declare const getUser: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$M, any>>;

type Def$L = {
    Params: {};
    Data: GetUser["Data"];
    ErrorCodes: 'MISSING_TOKEN';
};

type Def$K = {
    Params: {
        email: string;
    };
    Data: {
        user: UserM;
    };
    ErrorCodes: 'NOT_FOUND';
};

type Def$J = {
    Params: {
        email: string;
        password: string;
    };
    Data: {
        user: UserM;
        emailVerified: boolean;
        accessToken: string;
        /**
         * expiresIn in seconds
         */
        expiresIn: number;
        refreshToken: string;
    };
    ErrorCodes: 'NOT_FOUND' | 'INCORRECT_CREDENTIAL';
};

type Def$I = {
    Params: {
        email: string;
        password: string;
    };
    Data: {
        user: UserM;
        emailVerified: boolean;
    };
    ErrorCodes: 'ALREADY_REGISTERED';
};

type Def$H = {
    Params: {
        bookUid: string;
        pageIndex: number;
        parts: PageAnalysisE["data"]["parts"];
        words: PageAnalysisE["data"]["words"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

/**
 * Returns a specific book
 */
type Def$G = {
    Params: {
        uid: string;
    };
    Data: {
        item: PageAnalysisM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type PageTextE = {
    pk: ItemPK;
    data: {
        text: string;
    };
    meta: MetaData;
    links: {};
};
type PageTextM = PageTextE['data'] & PageTextE['meta'] & {
    uid: string;
    index: number;
};

type BookTextE = {
    pk: ItemPK;
    data: {};
    meta: MetaData;
    links: {};
    childs: {
        pages: PageTextE[];
    };
};
type BookTextM = BookTextE['data'] & BookTextE['meta'] & {
    uid: string;
    pages: PageTextM[];
};

/**
 * Returns a specific book
 */
type Def$F = {
    Params: {
        uid: string;
    };
    Data: {
        item: BookTextM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$E = {
    Params: {
        bookUid: string;
        pageIndex: number;
        text: PageTextE["data"]["text"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type Def$D = {
    Params: {
        bookUid: string;
        sectionIndex: number;
        title: SectionE["data"]["title"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type BoardContentType = "general" | "simpleDivision" | "longDivision" | "longMultiplication" | "columnArithmetic" | "polynomialDivision" | "syntheticDivision" | "numberLine" | "coordinateGraph" | "geometryDiagram" | "factorTree" | "probabilityTree";

type StepE<ChunkT = any> = {
    pk: ItemPK;
    data: {
        type: 'step';
        chunk: ChunkT;
    };
    meta: MetaData;
    links: {};
    childs: {};
};
type StepM = StepE['data'] & StepE['meta'] & {
    uid: string;
};

type TaskE<InputT = Record<string, any>, OutputT = Record<string, any>> = {
    pk: ItemPK;
    data: {
        type: 'text-steps' | 'step-processing' | 'tts-prepare' | 'validate-board' | 'pre-tts' | 'tts' | 'uploaded-image';
        status?: 'pending' | 'completed' | 'canceled';
        predecessorUids?: string[];
        input?: InputT;
        output?: OutputT;
    };
    meta: MetaData;
    links: {};
    childs: {
        steps: StepE[];
    };
};
type TaskM = TaskE['data'] & TaskE['meta'] & {
    uid: string;
    taskGroupUid: string;
    steps?: StepM[];
};
type TextStepsOutput = {
    steps: TextStepOutputChunk[];
    options?: string[];
};
type TextStepOutputChunk = {
    stepIndex: number;
    stepId: string;
    language: 'ar' | 'en';
    textToSay: string;
    boardContent?: {
        type: BoardContentType;
        richHtmlWithSVGAndMathML: string;
    };
};

/**
 * Lists all journeys for a specific customer
 */
type Def$C = {
    Params: {
        conversationUid: string;
    };
    Data: {
        messages: {
            uid: string;
            type: "page-image" | "page-analysis" | "user-text" | "instructions" | "assistant" | 'user-audio' | 'user-uploaded-image';
            userText?: string;
            assistant?: TextStepsOutput;
            uploadUid?: string;
        }[];
    };
    ErrorCodes: never;
    WarningCodes: never;
};

type ConversationE = {
    pk: ItemPK;
    data: {
        language: 'ar' | 'en';
    };
    meta: MetaData;
    links: {
        user: ItemPK;
    };
    childs: {};
};

type Def$B = {
    Params: {
        uid: string;
        language?: ConversationE["data"]["language"];
    };
    Data: {
        success: boolean;
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};

type Def$A = {
    Params: {
        language: ConversationE["data"]["language"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type MessageE = {
    pk: ItemPK;
    data: {
        bookUid?: string;
        pageIndex?: number;
        stepUid?: string;
        userReqType?: 'clarify-part' | 'clarify-concept' | 'clarify-question' | 'options' | 'audio';
        userText?: string;
        instructions?: string;
        assistant?: string;
    };
    meta: MetaData;
    links: {};
    childs: {};
};

type Def$z = {
    Params: {
        conversationUid: string;
        requestId: string;
        language: ConversationE['data']["language"];
        bookUid?: MessageE['data']["bookUid"];
        pageIndex?: MessageE['data']["pageIndex"];
        stepId?: MessageE['data']["stepUid"];
        event?: 'audio' | 'json' | 'cancel' | 'pause' | 'resume';
        recordingId?: boolean;
        preroll?: boolean;
        data?: string;
        ended?: boolean;
        avgIsSpeech: number;
        loudnessDbfs: number;
    };
    Data: {
        success: boolean;
    };
    ErrorCodes: never;
};

/**
 * Lists all journeys for a specific customer
 */
type Def$y = {
    Params: {
        conversationUid: string;
    };
    Data: {
        messages: {
            uid: string;
            type: "page-image" | "page-analysis" | "user-text" | "instructions" | "assistant" | 'user-audio';
            content: string;
        }[];
    };
    ErrorCodes: never;
    WarningCodes: never;
};

type TaskGroupE = {
    pk: ItemPK;
    data: {
        clientRequestId: string;
        status: 'running' | 'completed' | 'canceled' | 'paused';
        completedAt?: string;
    };
    meta: MetaData;
    links: {
        conversation?: ItemPK;
    };
    childs: {
        tasks: TaskE[];
    };
};
type TaskGroupM = TaskGroupE['data'] & TaskGroupE['meta'] & {
    uid: string;
    conversationUid?: string;
    tasks: TaskM[];
};

/**
 * Lists all journeys for a specific customer
 */
type Def$x = {
    Params: {
        conversationUid: string;
        query?: ListQueryParams$1<never, never>;
    };
    Data: {
        items: TaskGroupM[];
        next?: string;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

/**
 * Lists all journeys for a specific customer
 */
type Def$w = {
    Params: {
        conversationUid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

/**
 * Lists all journeys for a specific customer
 */
type Def$v = {
    Params: {
        conversationUid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

/**
 * Lists all journeys for a specific customer
 */
type Def$u = {
    Params: {
        conversationUid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};

type Def$t = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$s = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$r = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

/**
 * Returns a specific book
 */
type Def$q = {
    Params: {
        uid: string;
    };
    Data: {
        item: TaskGroupM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$p = {
    Params: {
        uid: string;
        status: TaskGroupE["data"]["status"];
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$o = {
    Params: {
        conversationUid: string;
        clientRequestId: TaskGroupE["data"]["clientRequestId"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type Def$n = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$m = {
    Params: {
        taskUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$l = {
    Params: {
        taskUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$k = {
    Params: {
        taskUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$j = {
    Params: {
        taskUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$i = {
    Params: {
        taskUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$h = {
    Params: {
        taskUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$g = {
    Params: {
        uid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$f = {
    Params: {
        taskUid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: 'UNSUPPORTED_TASK_TYPE';
};

/**
 * Returns a specific book
 */
type Def$e = {
    Params: {
        uid: string;
        include?: ("taskGroup" | "predecessors")[];
    };
    Data: {
        task: TaskM;
        taskGroup?: TaskGroupM;
        predecessors?: TaskM[];
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$d = {
    Params: {
        uid: string;
        status?: TaskE["data"]["status"];
        output?: TaskE["data"]["output"];
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$c = {
    Params: {
        taskGroupUid: string;
        predecessorUids?: string[];
        type: TaskE["data"]["type"];
        input: TaskE["data"]["input"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type Def$b = {
    Params: {
        taskUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$a = {
    Params: {
        taskUid: string;
    };
    Data: {
        output: {
            text: string;
            cc: string;
        };
    };
    ErrorCodes: never;
};

type Def$9 = {
    Params: {
        taskUid: string;
        chunkIndex: number;
        chunk?: Buffer<ArrayBuffer>;
        completed?: boolean;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$8 = {
    Params: {
        taskUid: string;
        conversationUid: string;
        type: StepE["data"]["type"];
        chunk: TextStepOutputChunk;
    };
    Data: {};
    ErrorCodes: never;
};

type UsageE = {
    pk: ItemPK;
    data: {
        model: string;
        task: 'stt' | 'tts' | 'tts-prepare' | 'teaching' | 'book-structure' | 'board-content-validate' | 'board-html-prettier' | 'board-long-div' | 'board-long-multiply';
        type: 'tokens' | 'per-audio' | 'per-charachter';
        cost: number;
        tokens?: {
            input: number;
            cachedInput: number;
            output: number;
        };
        charactersCount?: number;
        audioMin?: number;
        info?: string;
    };
    meta: MetaData;
    links: {
        user: ItemPK;
        pdf?: ItemPK;
    };
    childs: {
        sections: SectionE[];
        pages: PageE[];
    };
};

type Def$7 = {
    Params: {
        model: UsageE["data"]["model"];
        task: UsageE["data"]["task"];
        type: UsageE["data"]["type"];
        cost: UsageE["data"]["cost"];
        tokens?: UsageE["data"]["tokens"];
        charactersCount?: UsageE["data"]["charactersCount"];
        audioMin?: UsageE["data"]["audioMin"];
        info?: UsageE["data"]["info"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};

type Def$6 = {
    Params: {
        taskUid: string;
    };
    Data: {
        output: TaskE["data"]["output"];
    };
    ErrorCodes: never;
};

type Def$5 = {
    Params: {
        taskUid: string;
    };
    Data: {
        output: {
            text: string;
        };
    };
    ErrorCodes: never;
};

type Def$4 = {
    Params: {
        taskUid: string;
    };
    Data: {
        output: TextStepsOutput;
    };
    ErrorCodes: never;
};

type Def$3 = {
    Params: {
        taskUid: string;
    };
    Data: {
        output: TaskE["data"]["output"];
    };
    ErrorCodes: never;
};

type Def$2 = {
    Params: {
        taskUid: string;
    };
    Data: {
        output: TextStepsOutput;
    };
    ErrorCodes: never;
};

type Def$1 = {
    Params: {
        name: string;
        args: any[];
    };
    Data: {
        output: any;
    };
    ErrorCodes: never;
};

type CallTool$1 = Def$1;

type CreateBook = Def$15;
declare const createBook: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    id?: string;
    title?: BookE["data"]["title"];
    language?: BookE["data"]["language"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$15, any>>;

type UpdateBook = Def$16;
declare const updateBook: (context: {}, depends: {
    tajData: {
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
    };
}) => (params: {
    uid: string;
    title?: BookE["data"]["title"];
    language?: BookE["data"]["language"];
    pagesCount?: BookE["data"]["pagesCount"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$16, any>>;

type GetBook = Def$17;
declare const getBook: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$17, any>>;

type DeleteBook = Def$18;
declare const deleteBook: (context: {}, depends: {
    tajData: {
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$18, any>>;

type ListMyBooks = Def$19;
declare const listMyBooks: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
    };
    listBooks: _dija_gormic_service_kit_domain.Service<ListBooks>;
}) => (params: {
    query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$19, any>>;

type AnalyzeBook = Def$1b;
declare const analyzeBook: (context: {
    getUserId: Context.GetUserId;
    generateBookStructure: Context.generateBookStructure;
}, depends: {
    getBookText: _dija_gormic_service_kit_domain.Service<GetBookText>;
    createSection: _dija_gormic_service_kit_domain.Service<CreateSection>;
    updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
    updatePage: _dija_gormic_service_kit_domain.Service<UpdatePage>;
    tajData: {
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1b, any>>;

type ArchiveBook = Def$1c;
declare const archiveBook: (context: {
    getClientIamId: Context.GetClientIamId;
    getClientUserId: Context.GetClientUserId;
    getSource: Context.GetSource;
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItem: Service<_dija_taj_data_services.GetItem>;
        updateItem: Service<_dija_taj_data_services.UpdateItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<ServiceResult<Def$1c>>;

type RestoreBook = Def$1d;
declare const restoreBook: (context: {}, depends: {
    tajData: {
        getItem: Service<_dija_taj_data_services.GetItem>;
        updateItem: Service<_dija_taj_data_services.UpdateItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<ServiceResult<Def$1d>>;

type DeleteMyBook = Def$1e;
declare const deleteMyBook: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
    };
    archiveBook: _dija_gormic_service_kit_domain.Service<ArchiveBook>;
    getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1e, any>>;

type CreateUpload = Def$W;
declare const createUpload: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    bookUid: string;
    index: number;
    width: PageE["data"]["width"];
    height: PageE["data"]["height"];
    fileSize: PageE["data"]["fileSize"];
    pageNumber?: PageE["data"]["pageNumber"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$W, any>>;

type GetUpload = Def$X;
declare const getUpload: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$X, any>>;

type UploadPdf = Def$Y;
declare const uploadPdf: (context: {
    appendFile: Context.AppendFile;
    pdfToImages: Context.PdfToImages;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    createBook: _dija_gormic_service_kit_domain.Service<CreateBook>;
    processPdf: _dija_gormic_service_kit_domain.Service<ProcessPdf>;
}) => (params: {
    fileId: string;
    fileName: string;
    fileSize: number;
    chunkIndex?: number;
    chunk?: any;
    completed?: boolean;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$Y, any>>;

type ProcessPdf = Def$Z;
declare const processPdf: (context: {
    pdfToImages: Context.PdfToImages;
}, depends: {
    createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
    getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    bookUid: string;
    uploadUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$Z, any>>;

type onPdfParsed = Def$_;
declare const onPdfParsed: (context: {
    pdfToImages: Context.PdfToImages;
}, depends: {
    createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
    getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
    updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    uploadUid: string;
    title?: string;
    pagesCount: number;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$_, any>>;

type OnPdfPageParsed = Def$$;
declare const onPdfPageParsed: (context: {
    pdfToImages: Context.PdfToImages;
    extractText: Context.extractText;
}, depends: {
    createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
    getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
    updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
    createPageText: _dija_gormic_service_kit_domain.Service<CreatePageText>;
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    uploadUid: string;
    pageIndex: number;
    width: number;
    height: number;
    fileSize: number;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$$, any>>;

type OnPdfParseEnd = Def$10;
declare const onPdfParseEnd: (context: {
    pdfToImages: Context.PdfToImages;
    extractText: Context.extractText;
}, depends: {
    createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
    getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
    getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
    updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
    createPageText: _dija_gormic_service_kit_domain.Service<CreatePageText>;
    analyzeBook: _dija_gormic_service_kit_domain.Service<AnalyzeBook>;
    updatePage: _dija_gormic_service_kit_domain.Service<UpdatePage>;
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    uploadUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$10, any>>;

type UploadImageToConversation = Def$11;
declare const uploadImageToConversation: (context: {
    appendFile: Context.AppendFile;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    createTaskGroup: _dija_gormic_service_kit_domain.Service<CreateTaskGroup>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
}) => (params: {
    conversationUid: string;
    fileId: string;
    fileName: string;
    fileSize: number;
    chunkIndex?: number;
    chunk?: any;
    completed?: boolean;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$11, any>>;

type CreatePage = Def$12;
declare const createPage: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    bookUid: string;
    pageIndex: number;
    width: PageE["data"]["width"];
    height: PageE["data"]["height"];
    fileSize: PageE["data"]["fileSize"];
    pageNumber?: PageE["data"]["pageNumber"];
    sectionId?: PageE["data"]["sectionId"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$12, any>>;

type UpdatePage = Def$13;
declare const updatePage: (context: {}, depends: {
    tajData: {
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
    };
}) => (params: {
    uid: string;
    width?: PageE["data"]["width"];
    height?: PageE["data"]["height"];
    fileSize?: PageE["data"]["fileSize"];
    pageNumber?: PageE["data"]["pageNumber"];
    sectionId?: PageE["data"]["sectionId"];
    textExtracted?: PageE["data"]["textExtracted"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$13, any>>;

type AnalyzePage = Def$14;
declare const analyzePage: (context: {
    analyzePage: Context.analyzePage;
}, depends: {
    tajData: {
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    createPageAnalysis: _dija_gormic_service_kit_domain.Service<CreatePageAnalysis>;
    getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$14, any>>;

type SignUp = Def$I;
declare const signUp: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
}) => (params: {
    email: string;
    password: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$I, any>>;

type SignIn = Def$J;
declare const signIn: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    cloud: {
        signAccessKey: _dija_gormic_service_kit_domain.Service<_dija_gormic_cloud_public.SignAccessKey>;
    };
}) => (params: {
    email: string;
    password: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$J, any>>;

type GetUserByEmail = Def$K;
declare const getUserByEmail: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getUser: _dija_gormic_service_kit_domain.Service<GetUser>;
}) => (params: {
    email: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$K, any>>;

type GetCurrentUser = Def$L;
declare const getCurrentUser: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
    getUser: _dija_gormic_service_kit_domain.Service<GetUser>;
}) => (params: {}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$L, any>>;

type RefreshAccessToken = Def$N;
declare const refreshAccessToken: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    cloud: {
        signAccessKey: _dija_gormic_service_kit_domain.Service<_dija_gormic_cloud_public.SignAccessKey>;
    };
}) => (params: {
    refreshToken: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$N, any>>;

type SendResetPassword = Def$O;
declare const sendResetPassword: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
}) => (params: {
    email: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$O, any>>;

type SendEmailOtp = Def$P;
declare const sendEmailOtp: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
}) => (params: {
    email: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$P, any>>;

type VerifyEmailOtp = Def$Q;
declare const verifyEmailOtp: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
}) => (params: {
    email: string;
    token: string;
    otp: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$Q, any>>;

type ResetPassword = Def$R;
declare const resetPassword: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
}) => (params: {
    token: string;
    newPassword: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$R, any>>;

type ChangePassword = Def$S;
declare const changePassword: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
    };
    getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
}) => (params: {
    oldPassword: string;
    newPassword: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$S, any>>;

type UpdateMyInfo = Def$T;
declare const updateMyInfo: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
    };
    updateUser: _dija_gormic_service_kit_domain.Service<UpdateUser>;
}) => (params: {
    name?: UserE["data"]["gender"];
    gender?: UserE["data"]["gender"];
    birthdate?: UserE["data"]["birthdate"];
    preferedLang?: UserE["data"]["preferedLang"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$T, any>>;

type ListUsers = Def$V;
declare const listUsers: (context: {}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
    };
}) => (params: {
    query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$V, any>>;

type GetPageAnalysis = Def$G;
declare const getPageAnalysis: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$G, any>>;

type CreatePageAnalysis = Def$H;
declare const createPageAnalysis: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    bookUid: string;
    pageIndex: number;
    parts: PageAnalysisE["data"]["parts"];
    words: PageAnalysisE["data"]["words"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$H, any>>;

type GetBookText = Def$F;
declare const getBookText: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$F, any>>;

type CreatePageText = Def$E;
declare const createPageText: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    bookUid: string;
    pageIndex: number;
    text: PageTextE["data"]["text"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$E, any>>;

type CreateSection = Def$D;
declare const createSection: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    bookUid: string;
    sectionIndex: number;
    title: SectionE["data"]["title"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$D, any>>;

type HandleMsg = Def$z;
declare const handleMsg: (context: {
    getUserId: Context.GetUserId;
    generateBookStructure: Context.generateBookStructure;
    sendToClient: Context.sendToClient;
}, depends: {
    tajData: {
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    createConversation: _dija_gormic_service_kit_domain.Service<CreateConversation>;
    updateConversation: _dija_gormic_service_kit_domain.Service<UpdateConversation>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    openaiSendText: _dija_gormic_service_kit_domain.Service<OpenaiSendText>;
    getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
    getPageAnalysis: _dija_gormic_service_kit_domain.Service<GetPageAnalysis>;
    analyzePage: _dija_gormic_service_kit_domain.Service<AnalyzePage>;
    cancelCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<CancelCoversationTaskGroups>;
    listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
    pauseCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<PauseCoversationTaskGroups>;
    resumeCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ResumeCoversationTaskGroups>;
    createTaskGroup: _dija_gormic_service_kit_domain.Service<CreateTaskGroup>;
}) => (params: {
    conversationUid: string;
    requestId: string;
    language: ConversationE["data"]["language"];
    bookUid?: MessageE["data"]["bookUid"];
    pageIndex?: MessageE["data"]["pageIndex"];
    stepId?: MessageE["data"]["stepUid"];
    event?: "audio" | "json" | "cancel" | "pause" | "resume";
    recordingId?: boolean;
    preroll?: boolean;
    data?: string;
    ended?: boolean;
    avgIsSpeech: number;
    loudnessDbfs: number;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$z, any>>;

type CreateConversation = Def$A;
declare const createConversation: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    language: ConversationE["data"]["language"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$A, any>>;

type UpdateConversation = Def$B;
declare const updateConversation: (context: {}, depends: {
    tajData: {
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
    };
}) => (params: {
    uid: string;
    language?: ConversationE["data"]["language"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$B, any>>;

type GetConversationLite = Def$C;
declare const getConversationLite: (context: {
    getUserId: Context.GetUserId;
    getPageImageBase64: Context.getPageImageBase64;
    sendToClient: Context.sendToClient;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        lock: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Lock>;
    };
    getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
    getPageAnalysis: _dija_gormic_service_kit_domain.Service<GetPageAnalysis>;
    analyzePage: _dija_gormic_service_kit_domain.Service<AnalyzePage>;
    listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
}) => (params: {
    conversationUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$C, any>>;

type CompactForTextSteps = Def$y;
declare const compactForTextSteps: (context: {
    getUserId: Context.GetUserId;
    getPageImageBase64: Context.getPageImageBase64;
    sendToClient: Context.sendToClient;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        lock: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Lock>;
    };
    getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
    getPageAnalysis: _dija_gormic_service_kit_domain.Service<GetPageAnalysis>;
    analyzePage: _dija_gormic_service_kit_domain.Service<AnalyzePage>;
    listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
}) => (params: {
    conversationUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$y, any>>;

type CreateTaskGroup = Def$o;
declare const createTaskGroup: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    conversationUid: string;
    clientRequestId: TaskGroupE["data"]["clientRequestId"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$o, any>>;

type UpdateTaskGroup = Def$p;
declare const updateTaskGroup: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    uid: string;
    status: TaskGroupE["data"]["status"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$p, any>>;

type GetTaskGroup = Def$q;
declare const getTaskGroup: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$q, any>>;

type CancelTaskGroup = Def$r;
declare const cancelTaskGroup: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
    cancelTask: _dija_gormic_service_kit_domain.Service<CancelTask>;
    updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$r, any>>;

type PauseTaskGroup = Def$s;
declare const pauseTaskGroup: (context: {
    pauseTaskGroup: Context.pauseTaskGroup;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
    updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$s, any>>;

type ResumeTaskGroup = Def$t;
declare const resumeTaskGroup: (context: {
    resumeTaskGroup: Context.resumeTaskGroup;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
    updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$t, any>>;

type CancelCoversationTaskGroups = Def$u;
declare const cancelCoversationTaskGroups: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
    };
    listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
    cancelTaskGroup: _dija_gormic_service_kit_domain.Service<CancelTaskGroup>;
}) => (params: {
    conversationUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$u, any>>;

type PauseCoversationTaskGroups = Def$v;
declare const pauseCoversationTaskGroups: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
    };
    listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
    pauseTaskGroup: _dija_gormic_service_kit_domain.Service<PauseTaskGroup>;
}) => (params: {
    conversationUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$v, any>>;

type ResumeCoversationTaskGroups = Def$w;
declare const resumeCoversationTaskGroups: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
    };
    listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
    resumeTaskGroup: _dija_gormic_service_kit_domain.Service<ResumeTaskGroup>;
}) => (params: {
    conversationUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$w, any>>;

type ListCoversationTaskGroups = Def$x;
declare const listCoversationTaskGroups: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
    };
}) => (params: {
    conversationUid: string;
    query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$x, any>>;

type OnTextStepChunk = Def$8;
declare const onTextStepChunk: (context: {
    getClientLanguage: Context.getClientLanguage;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
}) => (params: {
    taskUid: string;
    conversationUid: string;
    type: StepE["data"]["type"];
    chunk: TextStepOutputChunk;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$8, any>>;

type OnTTSChunk = Def$9;
declare const onTTSChunk: (context: {
    getClientLanguage: Context.getClientLanguage;
    sendToClient: Context.sendToClient;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
}) => (params: {
    taskUid: string;
    chunkIndex: number;
    chunk?: Buffer<ArrayBuffer>;
    completed?: boolean;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$9, any>>;

type PreTTS = Def$a;
declare const preTTS: (context: {
    getClientLanguage: Context.getClientLanguage;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$a, any>>;

type Def = {
    Params: {
        taskUid: string;
    };
    Data: {
        output: {
            textToSay?: string;
            html?: string;
        };
    };
    ErrorCodes: never;
};

type ProcessTextStep = Def;

type CheckCompletion = Def$b;
declare const checkCompletion: (context: {
    getClientLanguage: Context.getClientLanguage;
    sendToClient: Context.sendToClient;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
    updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$b, any>>;

type CreateTask = Def$c;
declare const createTask: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    taskGroupUid: string;
    predecessorUids?: string[];
    type: TaskE["data"]["type"];
    input: TaskE["data"]["input"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$c, any>>;

type UpdateTask = Def$d;
declare const updateTask: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    uid: string;
    status?: TaskE["data"]["status"];
    output?: TaskE["data"]["output"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$d, any>>;

type GetTask = Def$e;
declare const getTask: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
    getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
}) => (params: {
    uid: string;
    include?: ("taskGroup" | "predecessors")[];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$e, any>>;

type StartTask = Def$f;
declare const startTask: (context: {
    getUserId: Context.GetUserId;
    getOpenaiSession: Context.getOpenaiSession;
    startTask: Context.startTask;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    openaiSendText: _dija_gormic_service_kit_domain.Service<OpenaiSendText>;
    openaiTTSPrepare: _dija_gormic_service_kit_domain.Service<OpenaiTTSPrepare>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    openaiValidateBoard: _dija_gormic_service_kit_domain.Service<OpenaiValidateBoard>;
    executeSendText: _dija_gormic_service_kit_domain.Service<ExecuteSendText>;
    executeProcessTextStep: _dija_gormic_service_kit_domain.Service<ExecuteProcessTextStep>;
    executeTTSPrepare: _dija_gormic_service_kit_domain.Service<ExecuteTTSPrepare>;
    executeValidateBoard: _dija_gormic_service_kit_domain.Service<ExecuteValidateBoard>;
    executePreTTS: _dija_gormic_service_kit_domain.Service<ExecutePreTTS>;
    executeTTS: _dija_gormic_service_kit_domain.Service<ExecuteTTS>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$f, any>>;

type CancelTask = Def$g;
declare const cancelTask: (context: {
    cancelTask: Context.cancelTask;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$g, any>>;

type ExecutePreTTS = Def$h;
declare const executePreTTS: (context: {
    getClientLanguage: Context.getClientLanguage;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    openaiValidateBoard: _dija_gormic_service_kit_domain.Service<OpenaiValidateBoard>;
    preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$h, any>>;

type ExecuteProcessTextStep = Def$i;
declare const executeProcessTextStep: (context: {
    getClientLanguage: Context.getClientLanguage;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$i, any>>;

type ExecuteSendText = Def$j;
declare const executeSendText: (context: {
    getClientLanguage: Context.getClientLanguage;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    openaiSendText: _dija_gormic_service_kit_domain.Service<OpenaiSendText>;
    geminiSendText: _dija_gormic_service_kit_domain.Service<GeminiSendText>;
    preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    onTextStepChunk: _dija_gormic_service_kit_domain.Service<OnTextStepChunk>;
    checkCompletion: _dija_gormic_service_kit_domain.Service<CheckCompletion>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$j, any>>;

type ExecuteTTS = Def$k;
declare const executeTTS: (context: {
    getClientLanguage: Context.getClientLanguage;
    sendToClient: Context.sendToClient;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    grokTTS: _dija_gormic_service_kit_domain.Service<GrokTTS>;
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    checkCompletion: _dija_gormic_service_kit_domain.Service<CheckCompletion>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$k, any>>;

type ExecuteTTSPrepare = Def$l;
declare const executeTTSPrepare: (context: {
    getClientLanguage: Context.getClientLanguage;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    openaiTTSPrepare: _dija_gormic_service_kit_domain.Service<OpenaiTTSPrepare>;
    preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$l, any>>;

type ExecuteValidateBoard = Def$m;
declare const executeValidateBoard: (context: {
    getClientLanguage: Context.getClientLanguage;
}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    openaiValidateBoard: _dija_gormic_service_kit_domain.Service<OpenaiValidateBoard>;
    preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
    updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$m, any>>;

type CallTool = Def$n;
declare const callTool: (context: {}, depends: {}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$n, any>>;

type CreateUsage = Def$7;
declare const createUsage: (context: {}, depends: {
    tajData: {
        getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
        getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
    };
}) => (params: {
    model: UsageE["data"]["model"];
    task: UsageE["data"]["task"];
    type: UsageE["data"]["type"];
    cost: UsageE["data"]["cost"];
    tokens?: UsageE["data"]["tokens"];
    charactersCount?: UsageE["data"]["charactersCount"];
    audioMin?: UsageE["data"]["audioMin"];
    info?: UsageE["data"]["info"];
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$7, any>>;

type OpenaiSendText = Def$4;
declare const openaiSendText: (context: {
    getUserId: Context.GetUserId;
    getOpenaiSession: Context.getOpenaiSession;
    getTaskAbortContoller: Context.getTaskAbortContoller;
}, depends: {
    onTextStepChunk: _dija_gormic_service_kit_domain.Service<OnTextStepChunk>;
    createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    compactForTextSteps: _dija_gormic_service_kit_domain.Service<CompactForTextSteps>;
    callTool: _dija_gormic_service_kit_domain.Service<CallTool$1>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$4, any>>;

type OpenaiTTSPrepare = Def$5;
declare const openaiTTSPrepare: (context: {
    getUserId: Context.GetUserId;
    getOpenaiSession: Context.getOpenaiSession;
}, depends: {
    createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$5, any>>;

type OpenaiValidateBoard = Def$6;
declare const openaiValidateBoard: (context: {
    getUserId: Context.GetUserId;
    getOpenaiSession: Context.getOpenaiSession;
}, depends: {
    createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$6, any>>;

type GrokTTS = Def$3;
declare const grokTTS: (context: {
    getUserId: Context.GetUserId;
    getTaskAbortContoller: Context.getTaskAbortContoller;
}, depends: {
    onTTSChunk: _dija_gormic_service_kit_domain.Service<OnTTSChunk>;
    createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$3, any>>;

type GeminiSendText = Def$2;
declare const geminiSendText: (context: {
    getUserId: Context.GetUserId;
    getTaskAbortContoller: Context.getTaskAbortContoller;
}, depends: {
    onTextStepChunk: _dija_gormic_service_kit_domain.Service<OnTextStepChunk>;
    createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
    getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    compactForTextSteps: _dija_gormic_service_kit_domain.Service<CompactForTextSteps>;
    callTool: _dija_gormic_service_kit_domain.Service<CallTool$1>;
}) => (params: {
    taskUid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$2, any>>;

type LongDivisionContent = {
    parts: {
        type: "dividend" | "divisor" | "quotient" | "product" | "difference" | "bringDown";
        value: string;
    }[];
};

type LongMultiplicationContent = {
    type: "longMultiplication";
    parts: {
        type: "multiplicand" | "multiplier" | "partialProduct" | "sum";
        value: number;
    }[];
};

declare const APP_ID = "edu-ai";
declare const DEPLOYMENT_ID = "edu-ai-v1-1";
declare const HOST: string | undefined;
declare const MAX_INPUT_TOKENS = 250000;
declare const STT_MODE: 'separate' | 'gemini';
declare const DATA_SCHEMA: {
    collections: {
        books: string;
        pages: string;
        sections: string;
        pageAnalysis: string;
        bookText: string;
        pageText: string;
        uploads: string;
        users: string;
        credentials: string;
        conversations: string;
        messages: string;
        taskGroups: string;
        tasks: string;
        steps: string;
        usages: string;
    };
    links: {
        user_book: string;
        book_pdf: string;
        credentials_user: string;
        taskGroup_conversation: string;
        user_conversation: string;
    };
    sequences: {};
};
declare const UID_SCHEMA: {
    books: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    pageAnalysis: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    bookText: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    pageText: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    sections: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    users: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    conversations: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    messages: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    taskGroups: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    tasks: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    usages: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
    steps: {
        toUid: (pk: _dija_taj_data_services.ItemPK) => string;
        parse: (uid: string) => _dija_taj_data_services.ItemPK;
        generate: (parent?: _dija_taj_data_services.ItemPK, opts?: {
            msecs?: number;
        }) => {
            pk: {
                cid: string;
                pid: string | undefined;
                id: string;
                parent: _dija_taj_data_services.ItemPK | undefined;
                childKey: string | undefined;
            };
            uid: string;
            id: string;
        };
    };
};

type ServicesT = {
    [key: string]: (context: any, services: any) => Service<any>;
};
type CacheRule<ServiceNameT> = {
    cache: ServiceOptions['cache'];
    services: ServiceNameT[];
    repo: Context.CacheRepo;
};
declare const initServices: <T extends ServicesT>(appId: string, services: T, opts: {
    addLog?: Service<AddLog>;
    cacheRepo?: Context.CacheRepo;
    cacheRules?: CacheRule<string>[];
}) => (context: { [K in keyof T]: (x: Parameters<T[K]>["0"]) => void; }[keyof T] extends (x: infer I) => void ? I : never, depends: Omit<{ [K_1 in keyof T]: (x: Parameters<T[K_1]>["1"]) => void; }[keyof T] extends (x: infer I_1) => void ? I_1 : never, keyof T> & Partial<T>) => { [K_2 in keyof T]: ReturnType<T[K_2]>; };

declare const createCacheRepo: () => Context.CacheRepo;

declare const createBaseService: <ServiceT extends ServiceDef>(serviceFilePath: string, requiredParams: (keyof ServiceT["Params"])[], serviceHandler: (params: ServiceT["Params"], scope: any, errorout: (error: ServiceError<ServiceT>) => ServiceErrorImpl<any, any>, warn: (warning: ServiceWarning<ServiceT>) => void) => Promise<ServiceT["Data"]>) => (params: ServiceT["Params"], scope: any) => Promise<ServiceResult<ServiceT>>;

declare const PK: {
    toUid: (pk: ItemPK) => string;
    parse: (uid: string, collectionHeirarchy: string[]) => ItemPK;
};

declare const checkMissingParams: <ParamsT>(params: ParamsT, mandatory: (keyof ParamsT)[]) => ("*" | keyof ParamsT)[];

declare function embeddedUuidV7(timeMs?: number): string;

declare const servicesLib: {
    geminiSendText: (context: {
        getUserId: Context.GetUserId;
        getTaskAbortContoller: Context.getTaskAbortContoller;
    }, depends: {
        onTextStepChunk: _dija_gormic_service_kit_domain.Service<OnTextStepChunk>;
        createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        compactForTextSteps: _dija_gormic_service_kit_domain.Service<CompactForTextSteps>;
        callTool: _dija_gormic_service_kit_domain.Service<CallTool$1>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$2, any>>;
    grokTTS: (context: {
        getUserId: Context.GetUserId;
        getTaskAbortContoller: Context.getTaskAbortContoller;
    }, depends: {
        onTTSChunk: _dija_gormic_service_kit_domain.Service<OnTTSChunk>;
        createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$3, any>>;
    openaiSendText: (context: {
        getUserId: Context.GetUserId;
        getOpenaiSession: Context.getOpenaiSession;
        getTaskAbortContoller: Context.getTaskAbortContoller;
    }, depends: {
        onTextStepChunk: _dija_gormic_service_kit_domain.Service<OnTextStepChunk>;
        createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        compactForTextSteps: _dija_gormic_service_kit_domain.Service<CompactForTextSteps>;
        callTool: _dija_gormic_service_kit_domain.Service<CallTool$1>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$4, any>>;
    openaiTTSPrepare: (context: {
        getUserId: Context.GetUserId;
        getOpenaiSession: Context.getOpenaiSession;
    }, depends: {
        createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$5, any>>;
    openaiValidateBoard: (context: {
        getUserId: Context.GetUserId;
        getOpenaiSession: Context.getOpenaiSession;
    }, depends: {
        createUsage: _dija_gormic_service_kit_domain.Service<CreateUsage>;
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$6, any>>;
    createUsage: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        model: UsageE["data"]["model"];
        task: UsageE["data"]["task"];
        type: UsageE["data"]["type"];
        cost: UsageE["data"]["cost"];
        tokens?: UsageE["data"]["tokens"];
        charactersCount?: UsageE["data"]["charactersCount"];
        audioMin?: UsageE["data"]["audioMin"];
        info?: UsageE["data"]["info"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$7, any>>;
    onTextStepChunk: (context: {
        getClientLanguage: Context.getClientLanguage;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
    }) => (params: {
        taskUid: string;
        conversationUid: string;
        type: StepE["data"]["type"];
        chunk: TextStepOutputChunk;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$8, any>>;
    onTTSChunk: (context: {
        getClientLanguage: Context.getClientLanguage;
        sendToClient: Context.sendToClient;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
    }) => (params: {
        taskUid: string;
        chunkIndex: number;
        chunk?: Buffer<ArrayBuffer>;
        completed?: boolean;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$9, any>>;
    preTTS: (context: {
        getClientLanguage: Context.getClientLanguage;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$a, any>>;
    checkCompletion: (context: {
        getClientLanguage: Context.getClientLanguage;
        sendToClient: Context.sendToClient;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
        updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$b, any>>;
    createTask: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        taskGroupUid: string;
        predecessorUids?: string[];
        type: TaskE["data"]["type"];
        input: TaskE["data"]["input"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$c, any>>;
    updateTask: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        uid: string;
        status?: TaskE["data"]["status"];
        output?: TaskE["data"]["output"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$d, any>>;
    getTask: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
        getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
    }) => (params: {
        uid: string;
        include?: ("taskGroup" | "predecessors")[];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$e, any>>;
    startTask: (context: {
        getUserId: Context.GetUserId;
        getOpenaiSession: Context.getOpenaiSession;
        startTask: Context.startTask;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
        openaiSendText: _dija_gormic_service_kit_domain.Service<OpenaiSendText>;
        openaiTTSPrepare: _dija_gormic_service_kit_domain.Service<OpenaiTTSPrepare>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        openaiValidateBoard: _dija_gormic_service_kit_domain.Service<OpenaiValidateBoard>;
        executeSendText: _dija_gormic_service_kit_domain.Service<ExecuteSendText>;
        executeProcessTextStep: _dija_gormic_service_kit_domain.Service<ExecuteProcessTextStep>;
        executeTTSPrepare: _dija_gormic_service_kit_domain.Service<ExecuteTTSPrepare>;
        executeValidateBoard: _dija_gormic_service_kit_domain.Service<ExecuteValidateBoard>;
        executePreTTS: _dija_gormic_service_kit_domain.Service<ExecutePreTTS>;
        executeTTS: _dija_gormic_service_kit_domain.Service<ExecuteTTS>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$f, any>>;
    cancelTask: (context: {
        cancelTask: Context.cancelTask;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$g, any>>;
    executePreTTS: (context: {
        getClientLanguage: Context.getClientLanguage;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        openaiValidateBoard: _dija_gormic_service_kit_domain.Service<OpenaiValidateBoard>;
        preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$h, any>>;
    executeProcessTextStep: (context: {
        getClientLanguage: Context.getClientLanguage;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$i, any>>;
    executeSendText: (context: {
        getClientLanguage: Context.getClientLanguage;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        openaiSendText: _dija_gormic_service_kit_domain.Service<OpenaiSendText>;
        geminiSendText: _dija_gormic_service_kit_domain.Service<GeminiSendText>;
        preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
        onTextStepChunk: _dija_gormic_service_kit_domain.Service<OnTextStepChunk>;
        checkCompletion: _dija_gormic_service_kit_domain.Service<CheckCompletion>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$j, any>>;
    executeTTS: (context: {
        getClientLanguage: Context.getClientLanguage;
        sendToClient: Context.sendToClient;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        grokTTS: _dija_gormic_service_kit_domain.Service<GrokTTS>;
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
        checkCompletion: _dija_gormic_service_kit_domain.Service<CheckCompletion>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$k, any>>;
    executeTTSPrepare: (context: {
        getClientLanguage: Context.getClientLanguage;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        openaiTTSPrepare: _dija_gormic_service_kit_domain.Service<OpenaiTTSPrepare>;
        preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$l, any>>;
    executeValidateBoard: (context: {
        getClientLanguage: Context.getClientLanguage;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTask: _dija_gormic_service_kit_domain.Service<GetTask>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        openaiValidateBoard: _dija_gormic_service_kit_domain.Service<OpenaiValidateBoard>;
        preTTS: _dija_gormic_service_kit_domain.Service<PreTTS>;
        updateTask: _dija_gormic_service_kit_domain.Service<UpdateTask>;
    }) => (params: {
        taskUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$m, any>>;
    callTool: (context: {}, depends: {}) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$n, any>>;
    createTaskGroup: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        conversationUid: string;
        clientRequestId: TaskGroupE["data"]["clientRequestId"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$o, any>>;
    updateTaskGroup: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        uid: string;
        status: TaskGroupE["data"]["status"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$p, any>>;
    getTaskGroup: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$q, any>>;
    cancelTaskGroup: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
        cancelTask: _dija_gormic_service_kit_domain.Service<CancelTask>;
        updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$r, any>>;
    pauseTaskGroup: (context: {
        pauseTaskGroup: Context.pauseTaskGroup;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
        updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$s, any>>;
    resumeTaskGroup: (context: {
        resumeTaskGroup: Context.resumeTaskGroup;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getTaskGroup: _dija_gormic_service_kit_domain.Service<GetTaskGroup>;
        updateTaskGroup: _dija_gormic_service_kit_domain.Service<UpdateTaskGroup>;
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$t, any>>;
    cancelCoversationTaskGroups: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        };
        listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
        cancelTaskGroup: _dija_gormic_service_kit_domain.Service<CancelTaskGroup>;
    }) => (params: {
        conversationUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$u, any>>;
    pauseCoversationTaskGroups: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        };
        listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
        pauseTaskGroup: _dija_gormic_service_kit_domain.Service<PauseTaskGroup>;
    }) => (params: {
        conversationUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$v, any>>;
    resumeCoversationTaskGroups: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        };
        listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
        resumeTaskGroup: _dija_gormic_service_kit_domain.Service<ResumeTaskGroup>;
    }) => (params: {
        conversationUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$w, any>>;
    listCoversationTaskGroups: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        };
    }) => (params: {
        conversationUid: string;
        query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$x, any>>;
    compactForTextSteps: (context: {
        getUserId: Context.GetUserId;
        getPageImageBase64: Context.getPageImageBase64;
        sendToClient: Context.sendToClient;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            lock: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Lock>;
        };
        getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
        getPageAnalysis: _dija_gormic_service_kit_domain.Service<GetPageAnalysis>;
        analyzePage: _dija_gormic_service_kit_domain.Service<AnalyzePage>;
        listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
    }) => (params: {
        conversationUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$y, any>>;
    handleMsg: (context: {
        getUserId: Context.GetUserId;
        generateBookStructure: Context.generateBookStructure;
        sendToClient: Context.sendToClient;
    }, depends: {
        tajData: {
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        createConversation: _dija_gormic_service_kit_domain.Service<CreateConversation>;
        updateConversation: _dija_gormic_service_kit_domain.Service<UpdateConversation>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
        startTask: _dija_gormic_service_kit_domain.Service<StartTask>;
        openaiSendText: _dija_gormic_service_kit_domain.Service<OpenaiSendText>;
        getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
        getPageAnalysis: _dija_gormic_service_kit_domain.Service<GetPageAnalysis>;
        analyzePage: _dija_gormic_service_kit_domain.Service<AnalyzePage>;
        cancelCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<CancelCoversationTaskGroups>;
        listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
        pauseCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<PauseCoversationTaskGroups>;
        resumeCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ResumeCoversationTaskGroups>;
        createTaskGroup: _dija_gormic_service_kit_domain.Service<CreateTaskGroup>;
    }) => (params: {
        conversationUid: string;
        requestId: string;
        language: ConversationE["data"]["language"];
        bookUid?: MessageE["data"]["bookUid"];
        pageIndex?: MessageE["data"]["pageIndex"];
        stepId?: MessageE["data"]["stepUid"];
        event?: "audio" | "json" | "cancel" | "pause" | "resume";
        recordingId?: boolean;
        preroll?: boolean;
        data?: string;
        ended?: boolean;
        avgIsSpeech: number;
        loudnessDbfs: number;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$z, any>>;
    createConversation: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        language: ConversationE["data"]["language"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$A, any>>;
    updateConversation: (context: {}, depends: {
        tajData: {
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        };
    }) => (params: {
        uid: string;
        language?: ConversationE["data"]["language"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$B, any>>;
    getConversationLite: (context: {
        getUserId: Context.GetUserId;
        getPageImageBase64: Context.getPageImageBase64;
        sendToClient: Context.sendToClient;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            lock: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Lock>;
        };
        getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
        getPageAnalysis: _dija_gormic_service_kit_domain.Service<GetPageAnalysis>;
        analyzePage: _dija_gormic_service_kit_domain.Service<AnalyzePage>;
        listCoversationTaskGroups: _dija_gormic_service_kit_domain.Service<ListCoversationTaskGroups>;
    }) => (params: {
        conversationUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$C, any>>;
    createSection: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        bookUid: string;
        sectionIndex: number;
        title: SectionE["data"]["title"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$D, any>>;
    createPageText: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        bookUid: string;
        pageIndex: number;
        text: PageTextE["data"]["text"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$E, any>>;
    getBookText: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$F, any>>;
    getPageAnalysis: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$G, any>>;
    createPageAnalysis: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        bookUid: string;
        pageIndex: number;
        parts: PageAnalysisE["data"]["parts"];
        words: PageAnalysisE["data"]["words"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$H, any>>;
    signUp: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    }) => (params: {
        email: string;
        password: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$I, any>>;
    signIn: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
        cloud: {
            signAccessKey: _dija_gormic_service_kit_domain.Service<_dija_gormic_cloud_public.SignAccessKey>;
        };
    }) => (params: {
        email: string;
        password: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$J, any>>;
    getUser: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$M, any>>;
    getUserByEmail: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getUser: _dija_gormic_service_kit_domain.Service<GetUser>;
    }) => (params: {
        email: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$K, any>>;
    getCurrentUser: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
        getUser: _dija_gormic_service_kit_domain.Service<GetUser>;
    }) => (params: {}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$L, any>>;
    refreshAccessToken: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
        cloud: {
            signAccessKey: _dija_gormic_service_kit_domain.Service<_dija_gormic_cloud_public.SignAccessKey>;
        };
    }) => (params: {
        refreshToken: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$N, any>>;
    sendResetPassword: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    }) => (params: {
        email: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$O, any>>;
    sendEmailOtp: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    }) => (params: {
        email: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$P, any>>;
    verifyEmailOtp: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    }) => (params: {
        email: string;
        token: string;
        otp: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$Q, any>>;
    resetPassword: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    }) => (params: {
        token: string;
        newPassword: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$R, any>>;
    changePassword: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
        };
        getUserByEmail: _dija_gormic_service_kit_domain.Service<GetUserByEmail>;
    }) => (params: {
        oldPassword: string;
        newPassword: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$S, any>>;
    updateUser: (context: {}, depends: {
        tajData: {
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        };
    }) => (params: {
        uid: string;
        name?: UserE["data"]["gender"];
        gender?: UserE["data"]["gender"];
        birthdate?: UserE["data"]["birthdate"];
        preferedLang?: UserE["data"]["preferedLang"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$U, any>>;
    updateMyInfo: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        };
        updateUser: _dija_gormic_service_kit_domain.Service<UpdateUser>;
    }) => (params: {
        name?: UserE["data"]["gender"];
        gender?: UserE["data"]["gender"];
        birthdate?: UserE["data"]["birthdate"];
        preferedLang?: UserE["data"]["preferedLang"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$T, any>>;
    listUsers: (context: {}, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
        };
    }) => (params: {
        query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$V, any>>;
    createUpload: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        bookUid: string;
        index: number;
        width: PageE["data"]["width"];
        height: PageE["data"]["height"];
        fileSize: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$W, any>>;
    getUpload: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$X, any>>;
    uploadPdf: (context: {
        appendFile: Context.AppendFile;
        pdfToImages: Context.PdfToImages;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        createBook: _dija_gormic_service_kit_domain.Service<CreateBook>;
        processPdf: _dija_gormic_service_kit_domain.Service<ProcessPdf>;
    }) => (params: {
        fileId: string;
        fileName: string;
        fileSize: number;
        chunkIndex?: number;
        chunk?: any;
        completed?: boolean;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$Y, any>>;
    processPdf: (context: {
        pdfToImages: Context.PdfToImages;
    }, depends: {
        createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
        getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        bookUid: string;
        uploadUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$Z, any>>;
    onPdfParsed: (context: {
        pdfToImages: Context.PdfToImages;
    }, depends: {
        createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
        getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
        updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        uploadUid: string;
        title?: string;
        pagesCount: number;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$_, any>>;
    onPdfPageParsed: (context: {
        pdfToImages: Context.PdfToImages;
        extractText: Context.extractText;
    }, depends: {
        createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
        getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
        updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
        createPageText: _dija_gormic_service_kit_domain.Service<CreatePageText>;
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        uploadUid: string;
        pageIndex: number;
        width: number;
        height: number;
        fileSize: number;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$$, any>>;
    onPdfParseEnd: (context: {
        pdfToImages: Context.PdfToImages;
        extractText: Context.extractText;
    }, depends: {
        createPage: _dija_gormic_service_kit_domain.Service<CreatePage>;
        getUpload: _dija_gormic_service_kit_domain.Service<GetUpload>;
        getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
        updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
        createPageText: _dija_gormic_service_kit_domain.Service<CreatePageText>;
        analyzeBook: _dija_gormic_service_kit_domain.Service<AnalyzeBook>;
        updatePage: _dija_gormic_service_kit_domain.Service<UpdatePage>;
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        uploadUid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$10, any>>;
    uploadImageToConversation: (context: {
        appendFile: Context.AppendFile;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        createTaskGroup: _dija_gormic_service_kit_domain.Service<CreateTaskGroup>;
        createTask: _dija_gormic_service_kit_domain.Service<CreateTask>;
    }) => (params: {
        conversationUid: string;
        fileId: string;
        fileName: string;
        fileSize: number;
        chunkIndex?: number;
        chunk?: any;
        completed?: boolean;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$11, any>>;
    createPage: (context: {}, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        bookUid: string;
        pageIndex: number;
        width: PageE["data"]["width"];
        height: PageE["data"]["height"];
        fileSize: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
        sectionId?: PageE["data"]["sectionId"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$12, any>>;
    updatePage: (context: {}, depends: {
        tajData: {
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        };
    }) => (params: {
        uid: string;
        width?: PageE["data"]["width"];
        height?: PageE["data"]["height"];
        fileSize?: PageE["data"]["fileSize"];
        pageNumber?: PageE["data"]["pageNumber"];
        sectionId?: PageE["data"]["sectionId"];
        textExtracted?: PageE["data"]["textExtracted"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$13, any>>;
    analyzePage: (context: {
        analyzePage: Context.analyzePage;
    }, depends: {
        tajData: {
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
        createPageAnalysis: _dija_gormic_service_kit_domain.Service<CreatePageAnalysis>;
        getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$14, any>>;
    createBook: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        id?: string;
        title?: BookE["data"]["title"];
        language?: BookE["data"]["language"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$15, any>>;
    updateBook: (context: {}, depends: {
        tajData: {
            updateItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.UpdateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
        };
    }) => (params: {
        uid: string;
        title?: BookE["data"]["title"];
        language?: BookE["data"]["language"];
        pagesCount?: BookE["data"]["pagesCount"];
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$16, any>>;
    getBook: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$17, any>>;
    listBooks: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        };
    }) => (params: {
        userUid: string;
        query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1a, any>>;
    deleteBook: (context: {}, depends: {
        tajData: {
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$18, any>>;
    listMyBooks: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItems>;
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
        };
        listBooks: _dija_gormic_service_kit_domain.Service<ListBooks>;
    }) => (params: {
        query?: _dija_gormic_service_kit_domain.ListQueryParams<never, never>;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$19, any>>;
    analyzeBook: (context: {
        getUserId: Context.GetUserId;
        generateBookStructure: Context.generateBookStructure;
    }, depends: {
        getBookText: _dija_gormic_service_kit_domain.Service<GetBookText>;
        createSection: _dija_gormic_service_kit_domain.Service<CreateSection>;
        updateBook: _dija_gormic_service_kit_domain.Service<UpdateBook>;
        updatePage: _dija_gormic_service_kit_domain.Service<UpdatePage>;
        tajData: {
            getLinkedItems: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinkedItems>;
            getLinks: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetLinks>;
            createItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.CreateItem>;
            link: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.Link>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1b, any>>;
    archiveBook: (context: {
        getClientIamId: Context.GetClientIamId;
        getClientUserId: Context.GetClientUserId;
        getSource: Context.GetSource;
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItem: Service<_dija_taj_data_services.GetItem>;
            updateItem: Service<_dija_taj_data_services.UpdateItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<ServiceResult<Def$1c>>;
    restoreBook: (context: {}, depends: {
        tajData: {
            getItem: Service<_dija_taj_data_services.GetItem>;
            updateItem: Service<_dija_taj_data_services.UpdateItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<ServiceResult<Def$1d>>;
    deleteMyBook: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        };
        archiveBook: _dija_gormic_service_kit_domain.Service<ArchiveBook>;
        getBook: _dija_gormic_service_kit_domain.Service<GetBook>;
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1e, any>>;
};

export { APP_ID, BookChildsKeys, BookLinkKeys, Context, DATA_SCHEMA, DEPLOYMENT_ID, HOST, HTTPError, MAX_INPUT_TOKENS, PK, PageId, STATUS_PORTION, STT_MODE, ServiceErrorImpl, UID_SCHEMA, UserChildsKeys, UserLinkKeys, analyzeBook, analyzePage, archiveBook, callTool, cancelCoversationTaskGroups, cancelTask, cancelTaskGroup, changePassword, checkCompletion, checkMissingParams, compactForTextSteps, createBaseService, createBook, createCacheRepo, createConversation, createPage, createPageAnalysis, createPageText, createSection, createTask, createTaskGroup, createUpload, createUsage, deleteBook, deleteMyBook, embeddedUuidV7, executePreTTS, executeProcessTextStep, executeSendText, executeTTS, executeTTSPrepare, executeValidateBoard, geminiSendText, getBook, getBookText, getConversationLite, getCurrentUser, getPageAnalysis, getTask, getTaskGroup, getUpload, getUser, getUserByEmail, grokTTS, handleMsg, initServices, isServiceError, isServiceResult, listBooks, listCoversationTaskGroups, listMyBooks, listUsers, mapBook, mapPage, mapPageAnalysis, mapUser, onPdfPageParsed, onPdfParseEnd, onPdfParsed, onTTSChunk, onTextStepChunk, openaiSendText, openaiTTSPrepare, openaiValidateBoard, pauseCoversationTaskGroups, pauseTaskGroup, preTTS, processPdf, refreshAccessToken, resetPassword, restoreBook, resumeCoversationTaskGroups, resumeTaskGroup, sendEmailOtp, sendResetPassword, servicesLib, signIn, signUp, startTask, updateBook, updateConversation, updateMyInfo, updatePage, updateTask, updateTaskGroup, updateUser, uploadImageToConversation, uploadPdf, verifyEmailOtp };
export type { AddLog, AnalyzeBook, AnalyzePage, ArchiveBook, BookE, BookM, CacheRule, CallTool, CancelCoversationTaskGroups, CancelTask, CancelTaskGroup, ChangePassword, CheckCompletion, CompactForTextSteps, CreateBook, CreateConversation, CreatePage, CreatePageAnalysis, CreatePageText, CreateSection, CreateTask, CreateTaskGroup, CreateUpload, CreateUsage, DeleteBook, DeleteMyBook, Errors, ExcelBook, ExcelBorderStyle, ExcelCell, ExcelColumn, ExcelRow, ExcelWorksheet, ExecutePreTTS, ExecuteProcessTextStep, ExecuteSendText, ExecuteTTS, ExecuteTTSPrepare, ExecuteValidateBoard, Fetch, GeminiSendText, GetBook, GetBookText, GetConversationLite, GetCurrentUser, GetPageAnalysis, GetTask, GetTaskGroup, GetUpload, GetUser, GetUserByEmail, GrokTTS, HandleMsg, ListBooks, ListCoversationTaskGroups, ListMyBooks, ListQueryParams, ListQueryResult, ListUsers, LongDivisionContent, LongMultiplicationContent, OnPdfPageParsed, OnPdfParseEnd, OnTTSChunk, OnTextStepChunk, OpenaiSendText, OpenaiTTSPrepare, OpenaiValidateBoard, PageAnalysisE, PageAnalysisM, PageE, PageM, PauseCoversationTaskGroups, PauseTaskGroup, PreTTS, ProcessPdf, ProcessTextStep, RefreshAccessToken, ResetPassword, RestoreBook, ResumeCoversationTaskGroups, ResumeTaskGroup, Scope, SendEmailOtp, SendResetPassword, Service, ServiceDef, ServiceError, ServiceOptions, ServiceResult, ServiceResultOld, ServiceWarning, ServicesT, SignIn, SignUp, StartTask, UpdateBook, UpdateConversation, UpdateMyInfo, UpdatePage, UpdateTask, UpdateTaskGroup, UpdateUser, UploadImageToConversation, UploadPdf, UserE, UserM, VerifyEmailOtp };
