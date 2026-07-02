import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// useSessionTimeout.js  –  Watches for user activity and calls onTimeout once
//                          `sessionTimeoutMinutes` of inactivity has passed.
//                          Drop this into App.js so it applies app-wide,
//                          not per-page.
// ─────────────────────────────────────────────────────────────────────────────

// Activity events that count as "still here". Covers mouse, keyboard,
// touch, and scroll so the timer doesn't fire while someone is reading
// or filling a form without moving the mouse.
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

// sessionTimeout values that mean "never expire". Kept as strings since
// that's how the <Select> in Settings stores/returns them — add "never"
// here too if you add that as an option in the dropdown.
const NEVER_VALUES = ["0", "never", "off"];

export const useSessionTimeout = (sessionTimeoutMinutes, onTimeout) => {
  const timerRef = useRef(null);
  // Keep the latest onTimeout in a ref so the effect below doesn't need
  // to re-run (and re-attach listeners) just because the parent
  // re-rendered with a new function identity for onTimeout.
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    const minutes = Number(sessionTimeoutMinutes);
    const disabled =
      NEVER_VALUES.includes(String(sessionTimeoutMinutes)) || !minutes || minutes <= 0;

    if (disabled) {
      clearTimeout(timerRef.current);
      return undefined;
    }

    const ms = minutes * 60 * 1000;

    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onTimeoutRef.current(), ms);
    };

    reset(); // start the clock as soon as this mounts / the timeout value changes

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
    // Re-arm whenever the configured timeout length changes (e.g. user
    // just saved a new value in Settings).
  }, [sessionTimeoutMinutes]);
};