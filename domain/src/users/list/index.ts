import { Def } from './def.js';
import { createService } from './impl.js';

export type ListUsers = Def;
export const listUsers = createService;
