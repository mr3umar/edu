import { Def } from './def.js';
import { createService } from './impl.js';

export type GetBook = Def;
export const getBook = createService;
