import { useEffect, useRef, useState } from 'react';

export function useReaderDrag() {
  const [activePage, setActivePage] = useState(0);

  const [isDragging, setIsDragging] = useState(false);

  const timeoutRef = useRef<number>(900);

  const triggerDrag = () => {
    setIsDragging(true);

    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setIsDragging(false);
    }, 900);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    activePage,
    setActivePage,
    isDragging,
    triggerDrag,
  };
}