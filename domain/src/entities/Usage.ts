import { ItemPK, MetaData } from '@dija/taj-data-services';
import { HOST, UID_SCHEMA } from '../config.js';
import { mapPage, PageE, PageM } from './Page.js';
import { mapSection, SectionE, SectionM } from './Section.js';

export type UsageE = {
    pk: ItemPK;
    data: {
        model: string; 
        task: 'stt' | 'tts' | 'tts-prepare' | 'teaching' | 'book-structure' | 'board-content-validate' | 'board-html-prettier' | 'board-long-div' | 'board-long-multiply'; 
        type: 'tokens' | 'per-audio' | 'per-charachter', 
        cost: number;
        tokens?: {input: number, cachedInput: number, output: number}, 
        charactersCount?: number, 
        audioMin?: number, 
        info?: string
    };
    meta: MetaData
    links: {
        user: ItemPK;
        pdf?: ItemPK;
    };
    childs: {
        sections: SectionE[];
        pages: PageE[];
    };
};

export enum UsageLinkKeys {
}

export enum UsageChildsKeys {
}


export type UsageM = UsageE['data'] & UsageE['meta'] & {
    uid: string;
};

export const mapUsage = (item: UsageE) => {

    const uid = UID_SCHEMA.usages.toUid(item.pk)
    const map: UsageM = {
        ...item.data,
        uid,
    };

    return map;
};
