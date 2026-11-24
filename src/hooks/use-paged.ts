import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// The page's slide out (.orbit-panel__page, --orbit-duration-slow), and a little room.
const PAGE_EXIT_MS = 300;

/**
 * A pane with a list and one page pushed over it. The page stays rendered after Back until it has
 * slid out; `isOpen` says which of the two is in view. The focus goes with the page: onto Back once
 * it is in, and back to what opened it once the list is.
 */
export function usePaged<T>(containerRef: RefObject<HTMLElement | null>) {
  const [page, setPage] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // The card's own button, from the click: Safari does not focus a button it clicks, so the
  // focused element would not say which card it was.
  const open = useCallback((next: T, opener: HTMLElement) => {
    openerRef.current = opener;
    setPage(next);
    setIsOpen(true);
  }, []);

  const back = useCallback(() => setIsOpen(false), []);

  // Slid out, the page goes: nothing in it polls on, and the next one starts fresh.
  useEffect(() => {
    if (isOpen || !page) return;
    const timer = window.setTimeout(() => setPage(null), PAGE_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen, page]);

  // After the render, when the page that gets the focus is no longer hidden.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen) backRef.current?.focus({ preventScroll: true });
    else if (wasOpen.current && containerRef.current?.contains(openerRef.current)) {
      openerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = isOpen;
  }, [isOpen, page]);

  /** `replace` goes from one page to another, with the same list behind it. */
  return { page, isOpen, backRef, open, replace: setPage, back };
}
