import { checkMissingParams } from './functions/check-missing-params.js';
import { ServiceDef, ServiceError, ServiceErrorImpl, ServiceResult, ServiceWarning, isServiceError } from '../types.js';

export const createBaseService =
    <ServiceT extends ServiceDef>(
        serviceFilePath: string,
        requiredParams: (keyof ServiceT['Params'])[],
        serviceHandler: (
            params: ServiceT['Params'],
            scope: any,
            errorout: (error: ServiceError<ServiceT>) => ServiceErrorImpl<any, any>,
            warn: (warning: ServiceWarning<ServiceT>) => void,
        ) => Promise<ServiceT['Data']>,
    ) =>
    async (params: ServiceT['Params'], scope: any): Promise<ServiceResult<ServiceT>> => {
        const strs = serviceFilePath ? serviceFilePath.split('/') : '';
        const app = strs.length > 1 ? strs[0] : '';
        const serviceName = strs.length > 1 ? strs[1] : strs[0];

        const result: ServiceResult<ServiceT> = {
            app,
            service: serviceName,
            warnings: [],
            data: {},
        };

        try {
            const missingParams = checkMissingParams<ServiceT['Params']>(params, requiredParams);
            if (missingParams.length > 0) {
                result.error = {
                    code: 'ParamMissingError',
                    missingParams,
                };
                throw new ServiceErrorImpl<any, any>(result, params);
            }

            result.data = await serviceHandler(
                params,
                scope,
                (error) => {
                    if (error.description) {
                        error.description = error.description;
                    }
                    result.error = error;
                    throw new ServiceErrorImpl<any, any>(result, params);
                },
                (warning) => {
                    if (warning.description) {
                        warning.description = warning.description;
                    }
                    result.warnings.push(warning);
                },
            );

            return result;
        } catch (err: any) {
            if (!isServiceError(err)) {
                result.error = {
                    code: 'UnknownError',
                    description: `${err.message}. Stack: ${err.stack}`,
                };
                throw new ServiceErrorImpl(result, params);
            }
            throw err;
        }
    };
