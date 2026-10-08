import { Def } from './def.js';
import { createService } from './impl.js';

export type StartTask = Def;
export const startTask = createService;
