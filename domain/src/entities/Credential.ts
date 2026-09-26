import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';

export type CredentialE = {
    pk: ItemPK;
    data: {
        passwordHash?: string;
        verified: boolean;
    };
    meta: MetaData
    links: {
        user: ItemPK;
    };
    childs: {
    };
};


export enum CredentialLinkKeys {
    user = 'user',
}

export enum CredentialChildsKeys {
}


export type CredentialM = CredentialE['data'] & CredentialE['meta'] & {
    uid: string;
    userUid?: string;
};

export const mapCredential = (item: CredentialE) => {
    const map: CredentialM = {
        ...item.data,
        uid: item.pk.id,
        userUid: item.links?.user ? UID_SCHEMA.users.toUid(item.links?.user) : undefined,
    };

    return map;
};
