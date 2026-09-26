import { Def } from './def.js';
import { createService } from './impl.js';

export type SignIn = Def;
export const signIn = createService;
