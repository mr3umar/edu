import { Def } from './def.js';
import { createService } from './impl.js';

export type OnTTSChunk = Def;
export const onTTSChunk = createService;
