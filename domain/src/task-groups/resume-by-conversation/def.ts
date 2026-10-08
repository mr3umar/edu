import { ListQueryParams } from '@dija/gormic-service-kit-domain';
import { BookM } from '../../entities/Book.js';
import { TaskGroupM } from '../../entities/TaskGroup.js';

export const serviceName = 'resumeCoversationTaskGroups';
/**
 * Lists all journeys for a specific customer
 */
export type Def = {
    Params: {
        conversationUid: string;
    };
    Data: {
        succeed: boolean;
    };
    ErrorCodes: never;
    WarningCodes: never;
};
