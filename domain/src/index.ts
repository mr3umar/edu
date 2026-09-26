import * as books from './books/index.js';
import * as uploads from './uploads/index.js';
import * as pages from './pages/index.js';
import * as users from './users/index.js';
import * as pageAnalysis from './page-analysis/index.js';
import * as bookText from './book-text/index.js';
import * as pageText from './page-text/index.js';
import * as sections from './sections/index.js';

export * from './books/index.js'
export * from './pages/index.js'
export * from './uploads/index.js'
export * from './users/index.js'
export * from './page-analysis/index.js'
export * from './book-text/index.js'
export * from './page-text/index.js'
export * from './sections/index.js'
export * from './types.js'
export * from './board-content-types/index.js'
export * from './config.js'
export * from './common/index.js'
export * from './context.js'
export * from './functions/index.js'
export * from './entities/index.js'

export const servicesLib = {
        ...books,
        ...pages,
        ...uploads,
        ...users,
        ...pageAnalysis,
        ...bookText,
        ...pageText,
        ...sections,
}