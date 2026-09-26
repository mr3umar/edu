import { Def } from './def.js';
import { createService } from './impl.js';

export type GetBookText = Def;
export const getBookText = createService;
