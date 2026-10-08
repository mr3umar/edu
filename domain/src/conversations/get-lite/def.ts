import { TextStepsOutput } from '../../entities/Task.js';

export const serviceName = 'getConversationLite';
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
            type: "page-image" | "page-analysis" | "user-text" | "instructions" | "assistant" | 'user-audio' | 'user-uploaded-image'
            userText?: string;
            assistant?: TextStepsOutput;
            uploadUid?: string;
        }[];
    };
    ErrorCodes: never;
    WarningCodes: never;
};
