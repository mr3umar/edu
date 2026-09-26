import { Def } from './def.js';
import { createService } from './impl.js';

export type ChangePassword = Def;
export const changePassword = createService;
