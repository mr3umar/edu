import { BookE } from "../../entities/Book.js";
import { ConversationE } from "../../entities/Conversation.js";

export const serviceName = 'updateConversation';
export type Def = {
    Params: {
        uid: string;
        language?: ConversationE["data"]["language"]
    };
    Data: {
        success: boolean
    };
    ErrorCodes: 'NoChanges';
    WarningCodes: never;
};
