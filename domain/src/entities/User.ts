import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';

export type UserE = {
    pk: ItemPK;
    data: {
        name?: string;
        gender?: 'm' | 'f';
        /**
         * format YYYY-MM-DD
         */
        birthdate?: string;
        preferedLang?: 'ar' | 'en';
    };
    meta: MetaData
    links: {
        email?: ItemPK;
    };
    childs: {
    };
};


export enum UserLinkKeys {
    email = 'email',
}

export enum UserChildsKeys {
}


export type UserM = UserE['data'] & UserE['meta'] & {
    uid: string;
    email?: string;
};

export const mapUser = (item: UserE) => {
    const map: UserM = {
        ...item.data,
        uid: UID_SCHEMA.users.toUid(item.pk),
        email: item.links?.email ? item.links?.email.id : undefined,
    };

    return map;
};
