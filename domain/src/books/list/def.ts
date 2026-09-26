import { ListQueryParams } from '@dija/gormic-service-kit-domain';
import { BookM } from '../../entities/Book.js';

export const serviceName = 'listBooks';
/**
 * Lists all journeys for a specific customer
 */
export type Def = {
    Params: {
        userUid: string;
        query?: ListQueryParams<never, never>
    };
    Data: {
        items: BookM[];
        next?: string
    };
    ErrorCodes: never;
    WarningCodes: never;
};
