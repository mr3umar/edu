import { Def } from './def.js';
import { createService } from './impl.js';

export type CancelTaskGroup = Def;
export const cancelTaskGroup = createService;
