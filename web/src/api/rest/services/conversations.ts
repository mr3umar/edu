import type { CreateConversation, GetConversationLite } from '../../../domain';
import { createRestService } from '../createRestService';

export const createConversation = createRestService<CreateConversation>('createConversation', (params) => {

  return {
    method: 'POST',
    path: `/api/createConversation`,
    body: {
      params
    }
  };
});

export const getConversationLite = createRestService<GetConversationLite>('getConversationLite', (params) => {

  return {
    method: 'POST',
    path: `/api/getConversationLite`,
    body: {
      params
    }
  };
});
