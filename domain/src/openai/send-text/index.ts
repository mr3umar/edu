import { Def } from './def.js';
import { createService } from './impl.js';

export type OpenaiSendText = Def;
export const openaiSendText = createService;
