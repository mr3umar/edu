import { ItemPK, MetaData } from '@dija/taj-data-services';
import { HOST, UID_SCHEMA } from '../config.js';
import { mapPage, PageE, PageM } from './Page.js';
import { mapSection, SectionE, SectionM } from './Section.js';

export type BookE = {
    pk: ItemPK;
    data: {
        title?: string;
        language?: 'en' | 'ar'
        pagesCount?: number;

        archivedAt?: string | null;
        archivedBy?: string | null;
        archivedVia?: string | null;
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


export enum BookLinkKeys {
    pdf = 'pdf',
    user = 'user',
}

export enum BookChildsKeys {
    sections = 'sections',
    pages = 'pages',
}


export type BookM = BookE['data'] & BookE['meta'] & {
    uid: string;
    userUid: string;
    pdfUploadUid?: string;
    sections: SectionM[]
    pages: PageM[]
    thumbnailUrl: string;
    status: 'parsing' | 'analyzing' | 'finalizing' | 'completed',
    /**
     * out of 100
     */
    statusProgress: number
};

export const STATUS_PORTION = {
    uploading: 10,
    parsing: 30,
    extracting: 50,
    analyzing: 10,
}
export const mapBook = (item: BookE) => {

    const sections = (item.childs?.sections ?? []).map(mapSection)
    const pages = (item.childs?.pages ?? []).map(mapPage).sort((a, b) => a.index - b.index)

    let statusProgress = STATUS_PORTION.uploading
    let status: BookM["status"] = 'parsing'

    if(item.data.pagesCount) {

        if(item.data.pagesCount !== undefined) {
            statusProgress += (pages.length / item.data.pagesCount * STATUS_PORTION.parsing)   
        }

        if(pages.length === item.data.pagesCount) {
            status = "analyzing"
        }

        const pagesExtracted = pages.filter(p => p.textExtracted !== undefined)
        if(pagesExtracted.length > 0) {
            statusProgress += (pagesExtracted.length / item.data.pagesCount * STATUS_PORTION.extracting)
        }

        if(pagesExtracted.length == item.data.pagesCount) {
            status = "finalizing"
        }

        if(sections.length > 0) {
            status = "completed"
        }
    }

    const uid = UID_SCHEMA.books.toUid(item.pk)
    const map: BookM = {
        ...item.data,
        uid,
        language: item.data?.language ?? (item.data.title && item.data.title.includes("english") ? "en" : "ar"),
        userUid: UID_SCHEMA.users.toUid(item.links.user),
        sections,
        pages,
        thumbnailUrl: `${HOST}/book/${uid}/thumbnail/md`,
        pdfUploadUid: item.links?.pdf ? item.links?.pdf.id : undefined,

        status,
        statusProgress,
    };

    return map;
};
