import { Def } from './def.js';
import { createService } from './impl.js';

export type CallTool = Def;
export const callTool = createService;
