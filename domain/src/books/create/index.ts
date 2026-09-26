import { Def } from './def.js';
import { createService } from './impl.js';

export type CreateBook = Def;
export const createBook = createService;
