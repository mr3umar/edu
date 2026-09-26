import { Def } from './def.js';
import { createService } from './impl.js';

export type RestoreBook = Def;
export const restoreBook = createService;
