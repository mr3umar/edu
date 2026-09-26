import { Def } from './def.js';
import { createService } from './impl.js';

export type CreatePage = Def;
export const createPage = createService;
