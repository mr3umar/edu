import type { DeleteMyBook, GetBook, GetPageAnalysis, ListMyBooks } from '../../../domain';
import { createRestService } from '../createRestService';

export const listMyBooks = createRestService<ListMyBooks>('listMyBooks', (params) => {

  return {
    method: 'POST',
    path: `/api/listMyBooks`,
    body: {
      params
    }
  };
});
export const getBook = createRestService<GetBook>('getBook', (params) => {
  
  return {
    method: 'POST',
    path: `/api/getBook`,
    body: {
      params
    }
  };
});
export const getPageAnalysis = createRestService<GetPageAnalysis>('getPageAnalysis', (params) => {
  
  return {
    method: 'POST',
    path: `/api/getPageAnalysis`,
    body: {
      params
    }
  };
});
export const deleteMyBook = createRestService<DeleteMyBook>('deleteMyBook', (params) => {

  return {
    method: 'POST',
    path: `/api/deleteMyBook`,
    body: {
      params
    }
  };
});
