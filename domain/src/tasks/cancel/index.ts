import { Def } from './def.js';
import { createService } from './impl.js';

export type CancelTask = Def;
export const cancelTask = createService;
