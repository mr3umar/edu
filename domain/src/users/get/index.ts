import { Def } from './def.js';
import { createService } from './impl.js';

export type GetUser = Def;
export const getUser = createService;
