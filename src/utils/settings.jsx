// ─────────────────────────────────────────────────────────────────────────────
// settingsApi.js  –  All network calls for the Settings page live here, so
//                     useSettings.logic.js stays free of fetch/URL details.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = (extra = {}) => {
  const token = localStorage.getItem("token");
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
};

// ── GET /auth/settings ────────────────────────────────────────────────────
export const getSettings = () => apiFetch("/auth/settings", { method: "GET" });

// ── PATCH /auth/settings ──────────────────────────────────────────────────
// payload should only contain the fields you want to change — the backend
// whitelists keys, so extra/unknown fields are silently dropped rather
// than erroring, but keep it to the known settings shape regardless.
export const updateSettings = (payload) =>
  apiFetch("/auth/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

// ── POST /auth/change-password ────────────────────────────────────────────
export const changePassword = ({ currentPassword, newPassword }) =>
  apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });