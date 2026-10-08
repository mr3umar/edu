import { Def } from './def.js';
import { createService } from './impl.js';

export type GetTask = Def;
export const getTask = createService;
