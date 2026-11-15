import { useEffect, useEffectEvent } from "react";

const TYPING_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]';

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TYPING_SELECTOR) !== null;
}

/** `N` focuses the next session waiting on the user and `Escape` clears focus, unless typing. */
export function useIslandKeys(handlers: {
  readonly onNext: () => void;
  readonly onClear: () => void;
}) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTyping(event.target) || isTyping(document.activeElement)) return;
    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      handlers.onNext();
    } else if (event.key === "Escape") {
      handlers.onClear();
    }
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Subscribes to window key presses, which React has no prop for.
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
