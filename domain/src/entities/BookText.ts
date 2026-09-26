import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';
import { mapPageText, PageTextE, PageTextM } from './PageText.js';

export type BookTextE = {
    pk: ItemPK;
    data: {
    };
    meta: MetaData
    links: {};
    childs: {
        pages: PageTextE[];
    };
};


export enum BookTextLinkKeys {
}

export enum BookTextChildsKeys {
    pages = 'pages',
}


export type BookTextM = BookTextE['data'] & BookTextE['meta'] & {
    uid: string;
    pages: PageTextM[]
};

export const mapBookText = (item: BookTextE) => {
    const map: BookTextM = {
        ...item.data,
        uid: UID_SCHEMA.bookText.toUid(item.pk),
        pages: (item.childs?.pages ?? []).map(mapPageText).sort((a, b) => a.index - b.index),
    };

    return map;
};
