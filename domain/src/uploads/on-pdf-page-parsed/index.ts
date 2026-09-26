import { Def } from './def.js';
import { createService } from './impl.js';

export type OnPdfPageParsed = Def;
export const onPdfPageParsed = createService;
