import { ItemPK, MetaData } from '@dija/taj-data-services';
import { HOST, UID_SCHEMA } from '../config.js';

export type SectionE = {
    pk: ItemPK;
    data: {
        title?: string;
    };
    meta: MetaData
    links: {};
};

export type SectionM = SectionE['data'] & SectionE['meta'] & {
    uid: string;
    id: string;
    index: number;
};

export const mapSection = (entity: SectionE) => {
    const bookUid = UID_SCHEMA.books.toUid(entity.pk.parent!)
    const map: SectionM = {
        ...entity.data,
        uid: `${bookUid}/${entity.pk.id}`,
        id: entity.pk.id,
        index: Number(entity.pk.id),
    };

    return map;
};
