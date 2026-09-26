import type { Service, ServiceDef, ServiceResult } from '../../domain';
import { httpFetch } from './http';

const APP_ID = 'edu-ai-web';

type RestRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  path: string;
  body?: unknown;
};

// Wraps a REST call as a Service<T> (domain.d.ts); backend is expected to respond with a ServiceResult<T> body.
export function createRestService<T extends ServiceDef>(
  serviceName: string,
  buildRequest: (params: T['Params']) => RestRequest,
): Service<T> {
  return async (params, _scope) => {
    const { method, path, body } = buildRequest(params);

    const { data, error } = await httpFetch<ServiceResult<T>>({
      method,
      path,
      headers: {},
      body,
    });

    if (error) {
      // error.code is already the real service error code — httpFetch reads
      // it straight out of the { error: { code, description } } body.
      return {
        app: APP_ID,
        service: serviceName,
        data: undefined as unknown as T['Data'],
        warnings: [],
        error: {
          code: error.code,
          description: error.message,
          missingParams: error.missingParams,
        } as ServiceResult<T>['error'],
      };
    }

    return data;
  };
}
