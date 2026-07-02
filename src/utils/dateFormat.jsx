// ─────────────────────────────────────────────────────────────────────────────
// dateFormat.js  –  Pure formatting helper. No React, no storage — just takes
//                   a date and a format string and returns the formatted text.
//                   Kept separate from useDateFormat.js so it's trivially
//                   unit-testable and reusable outside components (e.g. when
//                   building CSV export filenames/rows).
// ─────────────────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, "0");

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Supported values — must stay in sync with the <Select> options on the
// Settings page. Add a case here whenever you add an option there.
export const SUPPORTED_DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD MMM YYYY",
];

// dateInput can be a Date, an ISO string, or anything `new Date()` accepts.
// Returns "" for invalid/missing input rather than throwing or printing
// "Invalid Date" — safer for direct use in JSX.
export const formatDate = (dateInput, format = "DD/MM/YYYY") => {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const monthShort = MONTH_NAMES_SHORT[date.getMonth()];

  switch (format) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD MMM YYYY":
      return `${day} ${monthShort} ${year}`;
    case "DD/MM/YYYY":
    default:
      return `${day}/${month}/${year}`;
  }
};

// Same as formatDate but also appends a 24h time (HH:MM) — handy for
// tables that currently show raw timestamps (createdAt, etc.).
export const formatDateTime = (dateInput, format = "DD/MM/YYYY") => {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const datePart = formatDate(date, format);
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${datePart} ${timePart}`;
};