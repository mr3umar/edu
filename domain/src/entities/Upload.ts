import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';

export type UploadE = {
    pk: ItemPK;
    data: {
        fileName: string;
        size: string;
    };
    meta: MetaData
    links: {
        book?: ItemPK;
    };
};


export enum UploadLinkKeys {
    book = 'book',
}

export type UploadM = UploadE['data'] & UploadE['meta'] & {
    uid: string;
    bookUid?: string;
};

export const mapUpload = (item: UploadE) => {
    const map: UploadM = {
        ...item.data,
        uid: item.pk.id,
        bookUid: item.links?.book ? UID_SCHEMA.books.toUid(item.links?.book) : undefined,
    };

    return map;
};
