import { Def } from './def.js';
import { createService } from './impl.js';

export type SendResetPassword = Def;
export const sendResetPassword = createService;
