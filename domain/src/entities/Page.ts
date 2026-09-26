import { ItemPK, MetaData } from '@dija/taj-data-services';
import { HOST, UID_SCHEMA } from '../config.js';

export type PageE = {
    pk: ItemPK;
    data: {
        pageNumber?: string;
        width: number;
        height: number;
        fileSize: number;
        sectionId?: string;
        textExtracted?: boolean;
    };
    meta: MetaData
    links: {};
};

export type PageM = PageE['data'] & PageE['meta'] & {
    uid: string;
    id: string;
    index: number;
    imageUrl: string;
};

export const mapPage = (entity: PageE) => {
    const bookUid = UID_SCHEMA.books.toUid(entity.pk.parent!)
    const map: PageM = {
        ...entity.data,
        uid: `${bookUid}/${entity.pk.id}`,
        id: entity.pk.id,
        index: Number(entity.pk.id),
        imageUrl: `${HOST}/book/${bookUid}/page/${entity.pk.id}`
    };

    return map;
};


export const PageId = {
    parse: (uid: string) => {
        const [bookUid, index] = uid.split("/")

        return {
            bookUid,
            pageIndex: Number(index)
        }
    },
    toUid: (bookUid: string, index: number) => `${bookUid}/${index}`
}