import { Def } from './def.js';
import { createService } from './impl.js';

export type DeleteBook = Def;
export const deleteBook = createService;
