import { createUidSchema } from '@dija/gormic-service-kit-domain';

export const APP_ID = 'edu-ai';
export const DEPLOYMENT_ID = 'edu-ai-v1-1';

export const HOST = 'http://192.168.100.222:9004'

export const DATA_SCHEMA = {
    collections: {
        books: 'books',
        pages: 'pages',
        sections: 'sections',
        pageAnalysis: 'page-analysis',
        bookText: 'book-text',
        pageText: 'page-text',
        uploads: 'uploads',
        users: 'users',
        credentials: 'credentials',
    },
    links: {
        user_book: 'u_b',
        book_pdf: 'b_p',
        credentials_user: 'c_u',
    },
    sequences: {
        // subinventories: "subinventories"
    }
};

export const UID_SCHEMA = {
    books: createUidSchema([DATA_SCHEMA.collections.books], {
        mode: 'uuid-v7'
    }),
    pageAnalysis: createUidSchema([DATA_SCHEMA.collections.pageAnalysis], {
        mode: 'uuid-v7'
    }),
    bookText: createUidSchema([DATA_SCHEMA.collections.bookText], {
        mode: 'uuid-v7'
    }),
    pageText: createUidSchema([DATA_SCHEMA.collections.pageText], {
        mode: 'uuid-v7'
    }),
    sections: createUidSchema([DATA_SCHEMA.collections.sections], {
        mode: 'uuid-v7'
    }),
    users: createUidSchema([DATA_SCHEMA.collections.users], {
        mode: 'uuid-v7'
    }),
    // uploads: createUidSchema([DATA_SCHEMA.collections.uploads], {
    //     mode: 'uuid-v7'
    // }),
    // waitEntries: createUidSchema([DATA_SCHEMA.collections.waitEntries], {
    //     mode: 'uuid-v7'
    // }),
    // labels: createUidSchema([DATA_SCHEMA.collections.labels]),
    // reservationLabelAssignments: createUidSchema([DATA_SCHEMA.collections.labelAssignments, DATA_SCHEMA.collections.reservations]),
    // waitEntryLabelAssignments: createUidSchema([DATA_SCHEMA.collections.labelAssignments, DATA_SCHEMA.collections.waitEntries, DATA_SCHEMA.collections.waitPeriods]),
    // experiences: createUidSchema([DATA_SCHEMA.collections.experiences]),
};