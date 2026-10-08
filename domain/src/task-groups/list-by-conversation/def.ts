import { ListQueryParams } from '@dija/gormic-service-kit-domain';
import { BookM } from '../../entities/Book.js';
import { TaskGroupM } from '../../entities/TaskGroup.js';

export const serviceName = 'listCoversationTaskGroups';
/**
 * Lists all journeys for a specific customer
 */
export type Def = {
    Params: {
        conversationUid: string;
        query?: ListQueryParams<never, never>
    };
    Data: {
        items: TaskGroupM[];
        next?: string
    };
    ErrorCodes: never;
    WarningCodes: never;
};
