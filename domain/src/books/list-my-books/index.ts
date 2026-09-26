import { Def } from './def.js';
import { createService } from './impl.js';

export type ListMyBooks = Def;
export const listMyBooks = createService;
