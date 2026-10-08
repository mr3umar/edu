import { Def } from './def.js';
import { createService } from './impl.js';

export type HandleMsg = Def;
export const handleMsg = createService;
