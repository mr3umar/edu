import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';

export type PageTextE = {
    pk: ItemPK;
    data: {
        text: string
    };
    meta: MetaData
    links: {};
};

export type PageTextM = PageTextE['data'] & PageTextE['meta'] & {
    uid: string;
    index: number;
};

export const mapPageText = (entity: PageTextE) => {
    const map: PageTextM = {
        ...entity.data,
        uid: UID_SCHEMA.pageText.toUid(entity.pk),
        index: Number(entity.pk.id),
    };

    return map;
};
