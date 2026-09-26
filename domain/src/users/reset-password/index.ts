import { Def } from './def.js';
import { createService } from './impl.js';

export type ResetPassword = Def;
export const resetPassword = createService;
