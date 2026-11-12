import { useLayoutEffect, useRef, useState } from 'react';

/** The width of an element, measured before it is painted and followed as it changes. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return undefined;
    }
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => {
      setWidth(element.clientWidth);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { ref, width };
}
