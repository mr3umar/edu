import { Def } from './def.js';
import { createService } from './impl.js';

export type CreateTaskGroup = Def;
export const createTaskGroup = createService;
