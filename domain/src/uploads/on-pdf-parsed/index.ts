import { Def } from './def.js';
import { createService } from './impl.js';

export type onPdfParsed = Def;
export const onPdfParsed = createService;
