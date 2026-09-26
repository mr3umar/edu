import { Def } from './def.js';
import { createService } from './impl.js';

export type OnPdfParseEnd = Def;
export const onPdfParseEnd = createService;
