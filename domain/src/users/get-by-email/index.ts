import { Def } from './def.js';
import { createService } from './impl.js';

export type GetUserByEmail = Def;
export const getUserByEmail = createService;
