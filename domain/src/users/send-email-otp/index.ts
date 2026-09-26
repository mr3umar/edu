import { Def } from './def.js';
import { createService } from './impl.js';

export type SendEmailOtp = Def;
export const sendEmailOtp = createService;
