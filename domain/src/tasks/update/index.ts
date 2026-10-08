import { Def } from './def.js';
import { createService } from './impl.js';

export type UpdateTask = Def;
export const updateTask = createService;
