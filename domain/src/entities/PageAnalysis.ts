import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';

export type PageAnalysisE = {
    pk: ItemPK;
    data: {
        parts: {
            id: string;
            type: "question" | "question_group"
            content: string;
            parentId?: string;
            coordinates: {
                x: number;
                y: number;
                width: number;
                height: number;
            },
            transformedText?: {
                short: string;
                full: string
            }
        }[];
        words: {
            id: string;
            partId: string;
            text: string;
            x?: number;
            y?: number;
            width: number;
            height: number;
        }[]
    };
    meta: MetaData
    links: {};
};

export type PageAnalysisM = PageAnalysisE['data'] & PageAnalysisE['meta'] & {
    uid: string;
};

export const mapPageAnalysis = (entity: PageAnalysisE) => {
    const map: PageAnalysisM = {
        ...entity.data,
        uid: UID_SCHEMA.pageAnalysis.toUid(entity.pk),
    };

    return map;
};
