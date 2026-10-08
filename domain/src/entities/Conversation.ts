import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';

export type ConversationE = {
    pk: ItemPK;
    data: {
        language: 'ar' | 'en';
    };
    meta: MetaData
    links: {
        user: ItemPK;
    };
    childs: {
    };
};


export enum ConversationLinkKeys {
    user = 'user'
}

export enum ConversationChildsKeys {
}


export type ConversationM = ConversationE['data'] & ConversationE['meta'] & {
    uid: string;
    userUid: string;
};

export const mapConversation = (item: ConversationE) => {

    const uid = UID_SCHEMA.conversations.toUid(item.pk)
    const map: ConversationM = {
        ...item.data,
        uid,
        userUid: UID_SCHEMA.users.toUid(item.links.user),
    };

    return map;
};
