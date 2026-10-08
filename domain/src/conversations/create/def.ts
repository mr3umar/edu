import { BookE } from "../../entities/Book.js";
import { ConversationE } from "../../entities/Conversation.js";

export const serviceName = 'createConversation';
export type Def = {
    Params: {
        language: ConversationE["data"]["language"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
