import { Def } from './def.js';
import { createService } from './impl.js';

export type RefreshAccessToken = Def;
export const refreshAccessToken = createService;
