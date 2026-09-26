import { Def } from './def.js';
import { createService } from './impl.js';

export type GetCurrentUser = Def;
export const getCurrentUser = createService;
