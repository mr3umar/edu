import { ListQueryParams } from '@dija/gormic-service-kit-domain';
import { ListBooks } from '../list/index.js';

export const serviceName = 'listMyBooks';
/**
 * Lists all journeys for a specific customer
 */
export type Def = {
    Params: {
        query?: ListQueryParams<never, never>
    };
    Data: ListBooks["Data"];
    ErrorCodes: never;
    WarningCodes: never;
};
