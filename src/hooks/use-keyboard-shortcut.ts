"use client";

import { useEffect } from "react";

type KeyHandler = (event: KeyboardEvent) => void;

interface UseKeyboardShortcutOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  callback: KeyHandler,
  options: UseKeyboardShortcutOptions = {}
) {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    preventDefault = true,
  } = options;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt &&
        event.metaKey === meta
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, ctrl, shift, alt, meta, preventDefault]);
}

// Common shortcuts
export function useEscapeKey(callback: () => void) {
  useKeyboardShortcut("Escape", callback);
}

export function useSaveShortcut(callback: () => void) {
  useKeyboardShortcut("s", callback, { ctrl: true });
}
