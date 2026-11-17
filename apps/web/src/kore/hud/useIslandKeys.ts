import { useEffect, useEffectEvent } from "react";

import type { CameraPreset } from "../core/contract";

const CAMERA_KEYS: Readonly<Partial<Record<string, CameraPreset>>> = {
  "1": "overview",
  "2": "station",
  "3": "top",
};

const TYPING_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]';

function isTyping(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TYPING_SELECTOR) !== null;
}

/**
 * Unless typing: `N` focuses the next session waiting on the user in any world,
 * `[` and `]` step through the worlds, `1` to `3` pick a camera, `Escape` clears focus.
 */
export function useIslandKeys(handlers: {
  readonly onNext: () => void;
  readonly onClear: () => void;
  readonly onPrevWorld: () => void;
  readonly onNextWorld: () => void;
  readonly onCamera: (preset: CameraPreset) => void;
}) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTyping(event.target) || isTyping(document.activeElement)) return;
    const camera = CAMERA_KEYS[event.key];
    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      handlers.onNext();
    } else if (event.key === "[") {
      event.preventDefault();
      handlers.onPrevWorld();
    } else if (event.key === "]") {
      event.preventDefault();
      handlers.onNextWorld();
    } else if (camera !== undefined) {
      event.preventDefault();
      handlers.onCamera(camera);
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
