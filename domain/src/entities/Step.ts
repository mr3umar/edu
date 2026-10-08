import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';
import { BoardContentType } from '../server/types.js';

export type StepE<ChunkT = any> = {
    pk: ItemPK;
    data: {
        type: 'step';
        chunk: ChunkT 
    };
    meta: MetaData
    links: {
    };
    childs: {
    };
};


export enum StepLinkKeys {
}

export enum StepChildsKeys {
}


export type StepM = StepE['data'] & StepE['meta'] & {
    uid: string;
};

export const mapStep = (item: StepE) => {

    const uid = UID_SCHEMA.steps.toUid(item.pk)
    const map: StepM = {
        ...item.data,
        uid,
    };

    return map;
};


export type StepChunk = {
    currentResId: string, 
        stepIndex: number, 
        stepId: string, 
        language: 'ar' | 'en', 
        textToSay: string, 
        boardContent?: {
                type: BoardContentType,
                richHtmlWithSVGAndMathML: string;
        } | null
}