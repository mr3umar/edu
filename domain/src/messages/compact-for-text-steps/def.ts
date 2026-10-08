import { MessageM } from '../../entities/Message.js';

export const serviceName = 'compactForTextSteps';
/**
 * Lists all journeys for a specific customer
 */
export type Def = {
    Params: {
        conversationUid: string;
    };
    Data: {
        messages: {
            uid: string;
            type: "page-image" | "page-analysis" | "user-text" | "instructions" | "assistant" | 'user-audio'
            content: string;
        }[];
    };
    ErrorCodes: never;
    WarningCodes: never;
};
