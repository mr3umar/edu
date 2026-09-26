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
    code: 'UnknownError' | 'ParamMissingError' | 'ServerError' | 'Locked' | ServiceDefT['ErrorCodes'];
    description?: string;
    missingParams?: ('*' | keyof ServiceDefT['Params'])[];
    origin?: any;
    serverError?: ServerErrorT;
};

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
> = (params: ServiceT['Params'], scope: any) => Promise<ServiceResult<ServiceT, ServerErrorT>>;

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
}) => Promise<{
    statusCode?: number;
    data?: T;
    error?: HTTPError;
}>;

export type User = {
    id: string;
} & UserData;
export type UserData = {
    name?: string;
    sequence: number;
    number: string;
    gender?: 'M' | 'F';
    mobile: string;
    email?: string;
    birthDate?: string;
    cityId?: string;
    workEmail?: string;
    loyaltyJoiningDate?: string;
};
export type ReservationData = {
    userId: string;
    time: number;
    timeEn?: string;
    numberOfGuests: number;
    canceled: boolean;
    cancelationTime?: string;
    srStatus?: 'NOT_RECONCILED' | 'CONFIRMED' | 'CANCELED' | 'PAID' | 'COMPLETE' | 'NO_SHOW';
    srTables?: string[];
    srSeatedTime?: string;
    srLeftTime?: string;
    createdAt?: string;
    srCheckNumbers?: string;
    srTotalPayment?: number;
    srTotalGrossPayment?: number;
    srOnsitePaymentTax?: number;
    tableGroupId?: string;
    tableGroupName?: string;
};
export type Reservation = {
    id: string;
} & ReservationData;

export type GiftCard = {
    id: string;
} & GiftCardData;
export type GiftCardData = {
    fromUserId?: string;
    fromUserName?: string;
    toUserId: string;
    time: number;
    amount: number;
    consumed: number;
    message: string;
    code: string;
    createdAt: string;
};

export type Session = {
    userId: string;
    apiGroups: string[];
};
export type Benefit = {
    pk: string;
    cid: string;
} & BenefitData;
export type BenefitData = {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    type: 'discount-percent' | 'dicount-flat' | 'discount-absolute' | 'priority' | 'free-drink' | 'free-dessert';
    amount: number;
    source: 'level' | 'program';
    levelId: string;
    programId?: string;
    endDate?: string;
    discountRef?: string;
    period?: number;
    periodUnit?: 'm' | 'd';
    startMode?: 'enroll' | 'enroll-if-after' | 'period-after-enroll'; // undefined means specific
    startTime?: string; // iso
    minStartTime?: string; // iso
    endTime?: string; // iso
    startAfterPeriod?: number;
    startAfterPeriodUnit?: 'm' | 'd';
    sortNumber?: number;
};

export type OTPTokenData = {
    creationTime: number;
    life: number;
    phone: string;
};
export type PartnerOTPTokenData = {
    creationTime: number;
    life: number;
    email: string;
    userId: string;
    partnerId: string;
    otp: string;
};

export type City = {
    id: string;
} & CityData;

export type CityData = {
    nameAr: string;
    nameEn: string;
    provinceId: string;
};

export type ServiceDef = { Params: any; Data: any; ErrorCodes?: any; WarningCodes?: any };

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

export type EnrollmentData = {
    startTime: string; // iso
    ended?: boolean;
    endedAt?: string; // iso
};

export type ListQueryParams<TFilter extends Record<string, string | number>> = {
    offset?: string;
    limit?: number;
    filter?: TFilter;
};

export type ListQueryResult<TFilter extends Record<string, string | number>> = ListQueryParams<TFilter> & {
    total: number;
};

export type AccessKeyData = {
    ownerId: string;
    iamId: string;
    instanceIds: string[];
    groups?: string[];
    include?: string[];
};

export function isServiceResult<ServiceDefT extends ServiceDef>(
    result: ServiceResult<ServiceDefT, any> | Error,
): result is ServiceResult<ServiceDefT, any> {
    return (
        (<ServiceResult<any, any>>result).data !== undefined || (<ServiceResult<any, any>>result).error !== undefined
    );
}
