// src/utils/auth.js
// Reads the logged-in user (stored by useLogin.js after a successful login)
// and exposes small permission-check helpers used across the page hooks/UI.

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
};

// Raw JWT, stored separately from "user" by useLogin.js. Needed by any
// fetch wrapper (e.g. apiFetch in useClientMachines.logic.js) that has to
// attach an Authorization header to protected requests.
export const getToken = () => localStorage.getItem("token") || null;

// Superadmins have full access by default (no permissions array).
// Everyone else needs the page explicitly in their permissions list.
export const hasPermission = (page) => {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return Array.isArray(user.permissions) && user.permissions.includes(page);
};

export const isAdminOrSuper = () => {
  const role = getCurrentUser()?.role;
  return role === "administrator" || role === "superadmin";
};

export const isSuperAdmin = () => getCurrentUser()?.role === "superadmin";