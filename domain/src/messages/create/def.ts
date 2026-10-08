import { MessageE } from "../../entities/Message.js";

export const serviceName = 'createMessage';
export type Def = {
    Params: {
        conversationUid: string;
        stepUid?: MessageE["data"]["stepUid"];
        bookUid?: MessageE["data"]['bookUid'];
        pageIndex?: MessageE["data"]["pageIndex"];
        userReqType?: MessageE["data"]["userReqType"];
        userText?: MessageE["data"]["userText"];
        instructions?: MessageE["data"]["instructions"];
        assistant?: MessageE["data"]["assistant"];
    };
    Data: {
        uid: string;
    };
    ErrorCodes: never;
};
