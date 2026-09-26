import { Def } from './def.js';
import { createService } from './impl.js';

export type ListBooks = Def;
export const listBooks = createService;
