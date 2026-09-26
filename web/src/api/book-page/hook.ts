
import { useContext } from 'react';
import { PageContext } from './context';

export function useBookPage() {
  const context = useContext(PageContext);

  if (!context) {
    throw new Error(
      'useBookPage must be used within BookPageProvider'
    );
  }

  return context;
}

export function useTeacherWritings() {
  const context = useContext(PageContext);

  if (!context) {
    throw new Error(
      'useOrders must be used within OrdersProvider'
    );
  }

  return context;
}