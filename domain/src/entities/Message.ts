import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';

export type MessageE = {
    pk: ItemPK;
    data: {
        bookUid?: string
        pageIndex?: number
        stepUid?: string
        userReqType?: 'clarify-part' | 'clarify-concept' | 'clarify-question' | 'options' | 'audio'
        userText?: string
        instructions?: string
        assistant?: string
    };
    meta: MetaData
    links: {
    };
    childs: {
    };
};

export enum MessageLinkKeys {
}

export enum MessageChildsKeys {
}


export type MessageM = MessageE['data'] & MessageE['meta'] & {
    uid: string;
    conversationUid: string;
};

export const mapMessage = (item: MessageE) => {

    const uid = UID_SCHEMA.messages.toUid(item.pk)
    const map: MessageM = {
        ...item.data,
        uid,
        conversationUid: item.pk.pid!,
    };

    return map;
};

