import { Def } from './def.js';
import { createService } from './impl.js';

export type PauseTaskGroup = Def;
export const pauseTaskGroup = createService;
