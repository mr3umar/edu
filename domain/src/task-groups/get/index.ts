import { Def } from './def.js';
import { createService } from './impl.js';

export type GetTaskGroup = Def;
export const getTaskGroup = createService;
