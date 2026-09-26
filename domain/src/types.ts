
export type Errors =
    | 'UnknownError'
    | 'ParamMissingError'
    | 'NotFoundError'
    | 'InvalidOTP'
    | 'InvalidMobile'
    | 'HTTPError'
    | 'CancelReservation'
    | 'GetReservation';

// export type ServiceError = {
//     service: string;
//     type: Errors;
//     description: string;
//     stack: string[];
//     extra?: any;
// };
export type ServiceError<ServiceDefT extends ServiceDef, ServerErrorT = any> = {
    code:
        | 'UnknownError'
        | 'ParamMissingError'
        | 'InvalidParamError'
        | 'ServerError'
        | 'Locked'
        | ServiceDefT['ErrorCodes']
        | keyof ServerErrorT;
    description?: string;
    details?: string;
    missingParams?: ('*' | keyof ServiceDefT['Params'])[];
    origin?: any;
    serverError?: ServerErrorT;
} & ServiceDefT["Errors"];

export class HTTPError extends Error implements ServiceError<any> {
    service = 'Fetch';
    type: Errors = 'HTTPError';
    constructor(
        public code: number,
        public description: string,
        public origin: any,
    ) {
        super(`${code}: ${description}`);
    }
}

export type Service<
    ServiceT extends { Params: any; Data: any; ErrorCodes?: any; WarningCodes?: any },
    ServerErrorT = any,
    ScopeT = any,
> = (
    params: ServiceT['Params'],
    scope: ScopeT,
    options?: ServiceOptions,
) => Promise<ServiceResult<ServiceT, ServerErrorT>>;

export type ServiceOptions = {
    cache?: { key?: string; keyParam?: string; fallback: 'last'; ttl: number };
};
export type ServiceResultOld = {
    app: string;
    service: string;
};
export type ServiceResult<
    ServiceT extends { Params: any; Data: any; ErrorCodes?: any; WarningCodes?: any },
    ServerErrorT = any,
> = {
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
// export type UnknownError = ServiceError;

// export type NotFoundError = ServiceError;

export type Fetch = <T>(options: {
    url?: string;
    method: 'POST' | 'GET' | 'PUT' | 'PATCH';
    path: string;
    headers: { [key: string]: string };
    body?: any;
    returnType?: 'string' | 'buffer' | 'base64' // default string
}) => Promise<{
    statusCode?: number;
    data?: T;
    error?: HTTPError;
}>;
export type ServiceDef = { Params: any; Data: any; ErrorCodes?: any; WarningCodes?: any; Errors?: any };

export type ServiceWarning<ServiceDefT extends ServiceDef, ServerErrorT = any> = {
    code: 'Unknown' | ServiceDefT['WarningCodes'];
    description?: string;
    origin?: any;
};

export class ServiceErrorImpl<ServiceDefT extends ServiceDef, T2> extends Error {
    constructor(
        public result: ServiceResult<ServiceDefT, T2>,
        public params?: any,
    ) {
        super(JSON.stringify({ result, params }));
    }
}
export function isServiceError<ServiceDefT extends ServiceDef>(
    error: ServiceErrorImpl<ServiceDefT, any> | Error,
): error is ServiceErrorImpl<ServiceDefT, any> {
    return (<ServiceErrorImpl<any, any>>error).result !== undefined;
}

export function isServiceResult<ServiceDefT extends ServiceDef>(
    result: ServiceResult<ServiceDefT, any> | Error,
): result is ServiceResult<ServiceDefT, any> {
    return (
        (<ServiceResult<any, any>>result).data !== undefined || (<ServiceResult<any, any>>result).error !== undefined
    );
}

export type AddLog = {
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

export type ListQueryParams<TFilter extends Record<string, string | number | string[]>, TSort extends string> = {
    offset?: string;
    limit?: number;
    filter?: TFilter;
    sortBy?: TSort;
    sort?: 'ASC' | 'DESC';
};

export type ListQueryResult<
    TFilter extends Record<string, string | number | string[]>,
    TSort extends string,
> = ListQueryParams<TFilter, TSort> & {
    total?: number;
};

export type Scope = Record<string, any>;




export type ExcelBook = {
    addWorksheet: (name: string, options?: {
        pageSetup: { paperSize: 9, orientation: "landscape" | "portrait" },
    }) => ExcelWorksheet
    generateFile: () => Promise<ArrayBuffer>
}

export type ExcelWorksheet = {
    getRow: (index: number) => ExcelRow
    getColumn: (index: number) => ExcelColumn
    eachRow: (cb: (row: ExcelRow, rowNumber: number) => void) => void
    addImage: (image: string, options: {
        tl: { col: number, row: number },
        ext: { width: number, height: number },
      }) => void
      mergeCells: (top: number, left: number, bottom: number, right: number) => void
}

export type ExcelRow = {
    setValues: (values: string[]) => void,
    // getValues: () => string[],
    getFont: () => {bold?: boolean;size?: number;}
    setFont: (options: {bold?: boolean;size?: number;}) => void
    setHeight: (value: number) => void
    getCell: (letter: string) => ExcelCell
    eachCell: (cb: (cell: ExcelCell, columnNumber: number) => void) => void
}
export type ExcelColumn = {
    setWidth: (value: number) => void,
}
export type ExcelCell = {
    setValue: (value: any) => void
    setBorder: (options: {
        top?: ExcelBorderStyle,
        bottom?: ExcelBorderStyle,
    }) => void
    setAlignment: (options: { 
        wrapText?: true, 
        horizontal?: 'left' | 'center' | 'right' | 'fill' | 'justify' | 'centerContinuous' | 'distributed';
	    vertical?: 'top' | 'middle' | 'bottom' | 'distributed' | 'justify'; 
    }) => void
    setFill: (options: {
        type: 'pattern',
        pattern: 'solid',
        fgColor?: string,
        bgColor?: string,
    }) => void,
    setColor: (value: string) => void
}

export type ExcelBorderStyle = {
    style?: 'thin' | 'medium' | 'thick'
    color?: { 
        argb: string
    },
};