import { useState, useEffect, useCallback } from "react";
import { formatDate as formatDateWithPattern, formatDateTime as formatDateTimeWithPattern } from "../../utils/dateFormat";
import { SETTINGS_UPDATED_EVENT } from "./settings.logic";

const DEFAULT_FORMAT = "DD/MM/YYYY";

const readDateFormat = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.settings?.dateFormat || DEFAULT_FORMAT;
  } catch {
    return DEFAULT_FORMAT;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// useDateFormat.js  –  Any component that renders a date should call this
//                      instead of new Date(x).toLocaleDateString(...) or
//                      hand-rolled formatting. Keeps every table/list in the
//                      app using the same, currently-selected format, and
//                      updates live when the setting changes.
//
//   const { formatDate } = useDateFormat();
//   ...
//   <TableCell>{formatDate(report.createdAt)}</TableCell>
// ─────────────────────────────────────────────────────────────────────────────
export const useDateFormat = () => {
  const [dateFormat, setDateFormat] = useState(readDateFormat);

  useEffect(() => {
    // Settings page dispatches this after a successful save, with the
    // full settings object (including dateFormat) as event.detail.
    const onSettingsUpdated = (e) => {
      if (e.detail?.dateFormat) setDateFormat(e.detail.dateFormat);
    };
    // Covers the setting changing in another tab, where this tab won't
    // see the custom event but will see the native "storage" event.
    const onStorage = (e) => {
      if (e.key === "user") setDateFormat(readDateFormat());
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const formatDate = useCallback((dateInput) => formatDateWithPattern(dateInput, dateFormat), [dateFormat]);
  const formatDateTime = useCallback((dateInput) => formatDateTimeWithPattern(dateInput, dateFormat), [dateFormat]);

  return { dateFormat, formatDate, formatDateTime };
};