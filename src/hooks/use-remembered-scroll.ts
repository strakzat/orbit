import React, { useCallback } from "react";

/** Where a list stood. An object, so whoever keeps it can hold it past the list's unmount. */
export interface ScrollMemory {
  top: number;
}

/**
 * A scrolling element that opens where it was left. The ref puts it back as the element comes in,
 * before the paint, and again when the memory is another (a tab with its own place); the scroll
 * writes it down as it goes, as there is no reading it after the element is gone.
 */
export function useRememberedScroll<E extends HTMLElement>(memory: ScrollMemory) {
  const ref = useCallback(
    (el: E | null) => {
      if (el) el.scrollTop = memory.top;
    },
    [memory]
  );
  const onScroll = (e: React.UIEvent<E>) => {
    memory.top = e.currentTarget.scrollTop;
  };
  return { ref, onScroll };
}
