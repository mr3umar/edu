import * as _dija_gormic_service_kit_domain from '@dija/gormic-service-kit-domain';
import { ListQueryParams as ListQueryParams$1 } from '@dija/gormic-service-kit-domain';
import * as _gormic_utils_public from '@gormic/utils-public';
import * as _dija_taj_data_services from '@dija/taj-data-services';
import { ItemPK, MetaData } from '@dija/taj-data-services';
import * as _dija_gormic_cloud_public from '@dija/gormic-cloud-public';

type Def$z = {
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
type Def$y = {
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
type Def$x = {
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

type Def$w = {
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

declare namespace Context {
    type GetEnvTarget = (scope: Scope) => 'PROD' | 'TEST' | 'DEV';
    type GetUserId = (scope: Scope) => Promise<string | undefined>;
    type GetClientIamId = (scope: any) => Promise<string>;
    type GetClientUserId = (scope: any) => Promise<string>;
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
    type AppendFile = (scope: any, type: "pdf", fileId: string, fileName: string, fileSize: number, isCompleted: boolean, chunkIndex?: number, data?: Buffer) => Promise<void>;
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
}

/**
 * Lists all journeys for a specific customer
 */
type Def$v = {
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

type ListBooks = Def$v;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$v, any>>;

/**
 * Lists all journeys for a specific customer
 */
type Def$u = {
    Params: {
        query?: ListQueryParams$1<never, never>;
    };
    Data: ListBooks["Data"];
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
        }[];
        words: {
            id: string;
            x: number;
            y: number;
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

/**
 * Returns a specific book
 */
type Def$s = {
    Params: {
        uid: string;
    };
    Data: {
        item: BookM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$r = {
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

type Def$q = {
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

type Def$p = {
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

type Def$o = {
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

type Def$n = {
    Params: {
        uploadUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$m = {
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

type Def$l = {
    Params: {
        uploadUid: string;
        title?: string;
        pagesCount: number;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$k = {
    Params: {
        bookUid: string;
        uploadUid: string;
    };
    Data: {};
    ErrorCodes: never;
};

type Def$j = {
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
type Def$i = {
    Params: {
        uid: string;
    };
    Data: {
        item: UploadM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$h = {
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

type Def$g = {
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

type UpdateUser = Def$g;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$g, any>>;

type Def$f = {
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

type Def$e = {
    Params: {
        oldPassword: string;
        newPassword: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$d = {
    Params: {
        token: string;
        newPassword: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$c = {
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

type Def$b = {
    Params: {
        email: string;
    };
    Data: {
        token: string;
    };
    ErrorCodes: never;
};

type Def$a = {
    Params: {
        email: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
};

type Def$9 = {
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

type Def$8 = {
    Params: {
        uid: string;
    };
    Data: {
        user: UserM;
        emailVerified: boolean;
    };
    ErrorCodes: never;
};

type GetUser = Def$8;
declare const getUser: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$8, any>>;

type Def$7 = {
    Params: {};
    Data: GetUser["Data"];
    ErrorCodes: 'MISSING_TOKEN';
};

type Def$6 = {
    Params: {
        email: string;
    };
    Data: {
        user: UserM;
    };
    ErrorCodes: 'NOT_FOUND';
};

type Def$5 = {
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

type Def$4 = {
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

/**
 * Returns a specific book
 */
type Def$3 = {
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
type Def$2 = {
    Params: {
        uid: string;
    };
    Data: {
        item: BookTextM;
    };
    ErrorCodes: 'NotFound';
    WarningCodes: never;
};

type Def$1 = {
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

type Def = {
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

type CreateBook = Def$q;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$q, any>>;

type UpdateBook = Def$r;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$r, any>>;

type GetBook = Def$s;
declare const getBook: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$s, any>>;

type DeleteBook = Def$t;
declare const deleteBook: (context: {}, depends: {
    tajData: {
        deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$t, any>>;

type ListMyBooks = Def$u;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$u, any>>;

type AnalyzeBook = Def$w;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$w, any>>;

type ArchiveBook = Def$x;
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
}, scope: any) => Promise<ServiceResult<Def$x>>;

type RestoreBook = Def$y;
declare const restoreBook: (context: {}, depends: {
    tajData: {
        getItem: Service<_dija_taj_data_services.GetItem>;
        updateItem: Service<_dija_taj_data_services.UpdateItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<ServiceResult<Def$y>>;

type DeleteMyBook = Def$z;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$z, any>>;

type CreateUpload = Def$h;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$h, any>>;

type GetUpload = Def$i;
declare const getUpload: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$i, any>>;

type UploadPdf = Def$j;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$j, any>>;

type ProcessPdf = Def$k;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$k, any>>;

type onPdfParsed = Def$l;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$l, any>>;

type OnPdfPageParsed = Def$m;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$m, any>>;

type OnPdfParseEnd = Def$n;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$n, any>>;

type CreatePage = Def$o;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$o, any>>;

type UpdatePage = Def$p;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$p, any>>;

type SignUp = Def$4;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$4, any>>;

type SignIn = Def$5;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$5, any>>;

type GetUserByEmail = Def$6;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$6, any>>;

type GetCurrentUser = Def$7;
declare const getCurrentUser: (context: {
    getUserId: Context.GetUserId;
}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
    getUser: _dija_gormic_service_kit_domain.Service<GetUser>;
}) => (params: {}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$7, any>>;

type RefreshAccessToken = Def$9;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$9, any>>;

type SendResetPassword = Def$a;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$a, any>>;

type SendEmailOtp = Def$b;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$b, any>>;

type VerifyEmailOtp = Def$c;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$c, any>>;

type ResetPassword = Def$d;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$d, any>>;

type ChangePassword = Def$e;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$e, any>>;

type UpdateMyInfo = Def$f;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$f, any>>;

type GetBookText = Def$2;
declare const getBookText: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$2, any>>;

type CreatePageText = Def$1;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1, any>>;

type CreateSection = Def;
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
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def, any>>;

type GetPageAnalysis = Def$3;
declare const getPageAnalysis: (context: {}, depends: {
    tajData: {
        getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
    };
}) => (params: {
    uid: string;
}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$3, any>>;

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
declare const HOST = "http://192.168.100.222:9004";
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
    };
    links: {
        user_book: string;
        book_pdf: string;
        credentials_user: string;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$1, any>>;
    getBookText: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$2, any>>;
    getPageAnalysis: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$3, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$4, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$5, any>>;
    getUser: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$8, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$6, any>>;
    getCurrentUser: (context: {
        getUserId: Context.GetUserId;
    }, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
        getUser: _dija_gormic_service_kit_domain.Service<GetUser>;
    }) => (params: {}, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$7, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$9, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$a, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$b, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$c, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$d, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$e, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$g, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$f, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$h, any>>;
    getUpload: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$i, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$j, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$k, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$l, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$m, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$n, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$o, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$p, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$q, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$r, any>>;
    getBook: (context: {}, depends: {
        tajData: {
            getItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.GetItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$s, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$v, any>>;
    deleteBook: (context: {}, depends: {
        tajData: {
            deleteItem: _dija_gormic_service_kit_domain.Service<_dija_taj_data_services.DeleteItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$t, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$u, any>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$w, any>>;
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
    }, scope: any) => Promise<ServiceResult<Def$x>>;
    restoreBook: (context: {}, depends: {
        tajData: {
            getItem: Service<_dija_taj_data_services.GetItem>;
            updateItem: Service<_dija_taj_data_services.UpdateItem>;
        };
    }) => (params: {
        uid: string;
    }, scope: any) => Promise<ServiceResult<Def$y>>;
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
    }, scope: any) => Promise<_gormic_utils_public.ServiceResult<Def$z, any>>;
};

export { APP_ID, BookChildsKeys, BookLinkKeys, Context, DATA_SCHEMA, DEPLOYMENT_ID, HOST, HTTPError, PK, PageId, STATUS_PORTION, ServiceErrorImpl, UID_SCHEMA, UserChildsKeys, UserLinkKeys, analyzeBook, archiveBook, changePassword, checkMissingParams, createBaseService, createBook, createCacheRepo, createPage, createPageText, createSection, createUpload, deleteBook, deleteMyBook, embeddedUuidV7, getBook, getBookText, getCurrentUser, getPageAnalysis, getUpload, getUser, getUserByEmail, initServices, isServiceError, isServiceResult, listBooks, listMyBooks, mapBook, mapPage, mapPageAnalysis, mapUser, onPdfPageParsed, onPdfParseEnd, onPdfParsed, processPdf, refreshAccessToken, resetPassword, restoreBook, sendEmailOtp, sendResetPassword, servicesLib, signIn, signUp, updateBook, updateMyInfo, updatePage, updateUser, uploadPdf, verifyEmailOtp };
export type { AddLog, AnalyzeBook, ArchiveBook, BookE, BookM, CacheRule, ChangePassword, CreateBook, CreatePage, CreatePageText, CreateSection, CreateUpload, DeleteBook, DeleteMyBook, Errors, ExcelBook, ExcelBorderStyle, ExcelCell, ExcelColumn, ExcelRow, ExcelWorksheet, Fetch, GetBook, GetBookText, GetCurrentUser, GetPageAnalysis, GetUpload, GetUser, GetUserByEmail, ListBooks, ListMyBooks, ListQueryParams, ListQueryResult, LongDivisionContent, LongMultiplicationContent, OnPdfPageParsed, OnPdfParseEnd, PageAnalysisE, PageAnalysisM, PageE, PageM, ProcessPdf, RefreshAccessToken, ResetPassword, RestoreBook, Scope, SendEmailOtp, SendResetPassword, Service, ServiceDef, ServiceError, ServiceOptions, ServiceResult, ServiceResultOld, ServiceWarning, ServicesT, SignIn, SignUp, UpdateBook, UpdateMyInfo, UpdatePage, UpdateUser, UploadPdf, UserE, UserM, VerifyEmailOtp };
