import { Def } from './def.js';
import { createService } from './impl.js';

export type CreateTask = Def;
export const createTask = createService;
