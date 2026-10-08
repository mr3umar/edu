import { Def } from './def.js';
import { createService } from './impl.js';

export type CreateConversation = Def;
export const createConversation = createService;
