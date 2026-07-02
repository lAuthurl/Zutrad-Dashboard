import { useState, useEffect } from "react";
import { getSettings, updateSettings, changePassword } from "../../utils/settings";

// Fired whenever this user's settings are successfully saved. App.js
// listens for this so the app-wide session-timeout timer (and anything
// else that depends on settings) picks up the new value immediately,
// without requiring a logout/login round trip.
export const SETTINGS_UPDATED_EVENT = "ztrd:settings-updated";

/* =========================================================================
   STYLE BUILDERS — derived sx objects keyed off the current theme `colors`.
   Kept here (rather than inline in JSX) so style logic can be tweaked or
   reused without touching component markup.
   ========================================================================= */

export const buildSwitchSx = (colors) => ({
  "& .MuiSwitch-switchBase.Mui-checked": { color: colors.greenAccent[500] },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: colors.greenAccent[700] },
});

export const buildSelectSx = (colors) => ({
  color: colors.grey[100], fontSize: "13px", minWidth: "150px",
  backgroundColor: colors.primary[300], borderRadius: "8px",
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
  "& .MuiSvgIcon-root": { color: colors.grey[400] },
});

export const buildCardSx = (colors) => ({
  backgroundColor: colors.primary[400], borderRadius: "12px", p: "20px 22px",
});

export const buildPasswordFieldSx = (colors) => ({
  "& .MuiInputLabel-root": { color: colors.grey[200], fontSize: "13px" },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.greenAccent[400] },
  "& .MuiOutlinedInput-root": {
    color: colors.grey[100], backgroundColor: "rgba(255,255,255,0.07)", borderRadius: "8px",
    "& fieldset": { borderColor: "rgba(255,255,255,0.15)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.3)" },
    "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
  },
  "& input": { color: colors.grey[100] },
  "& input::placeholder": { color: colors.grey[300], opacity: 1 },
});

/* =========================================================================
   CHANGE PASSWORD DIALOG — state, field visibility toggles, and validation.
   handleSubmit now calls the real /auth/change-password endpoint. Errors
   returned by the backend (wrong current password, rate-limited, etc.) are
   surfaced verbatim since the server already writes user-facing messages
   (see recordPwFailure / the 429 branch in auth.js).
   ========================================================================= */

export const usePasswordDialog = (onClose) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetFields = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const handleSubmit = async () => {
    setError("");

    if (!current || !next || !confirm) return setError("All fields are required.");
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New passwords do not match.");
    if (next === current) return setError("New password must be different from the current password.");

    setSubmitting(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        resetFields();
      }, 1500);
    } catch (err) {
      // err.message is already a user-facing string set by the backend
      // (wrong password + attempts remaining, or a 429 lockout message).
      setError(err.message || "Failed to change password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setError("");
    setSuccess(false);
    resetFields();
  };

  // each password field exposes its own [value, setValue, show, setShow]
  // so the UI file can render one input component for all three
  const fields = {
    current: { label: "Current Password", value: current, setValue: setCurrent, show: showCurrent, setShow: setShowCurrent },
    next: { label: "New Password", value: next, setValue: setNext, show: showNext, setShow: setShowNext },
    confirm: { label: "Confirm New Password", value: confirm, setValue: setConfirm, show: showConfirm, setShow: setShowConfirm },
  };

  return {
    fields,
    error,
    success,
    submitting,
    handleSubmit,
    handleClose,
  };
};

/* =========================================================================
   SETTINGS PAGE — all toggle/select state for notifications, security,
   and regional preferences, plus the password-dialog open/close state.
   Settings are now loaded from the server on mount and persisted via
   handleSaveChanges, instead of living purely as local React state.
   ========================================================================= */

// Falls back to these if the initial GET fails (e.g. offline) so the page
// still renders something sensible rather than blank/undefined controls.
const DEFAULT_SETTINGS = {
  notifMaintenance: true,
  notifReports: true,
  notifSupply: false,
  notifLowStock: true,
  sessionTimeout: "30",
  dateFormat: "DD/MM/YYYY",
};

export const useSettingsPage = () => {
  // ---- notification toggles ------------------------------------------------
  const [notifMaintenance, setNotifMaintenance] = useState(DEFAULT_SETTINGS.notifMaintenance);
  const [notifReports, setNotifReports] = useState(DEFAULT_SETTINGS.notifReports);
  const [notifSupply, setNotifSupply] = useState(DEFAULT_SETTINGS.notifSupply);
  const [notifLowStock, setNotifLowStock] = useState(DEFAULT_SETTINGS.notifLowStock);

  // ---- security / regional selects -----------------------------------------
  const [sessionTimeout, setSessionTimeout] = useState(DEFAULT_SETTINGS.sessionTimeout);
  const [dateFormat, setDateFormat] = useState(DEFAULT_SETTINGS.dateFormat);

  // ---- change password dialog visibility ------------------------------------
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const openPasswordDialog = () => setPwDialogOpen(true);
  const closePasswordDialog = () => setPwDialogOpen(false);

  // ---- load / save status -----------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ---- load settings on mount ------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const s = await getSettings();
        if (cancelled) return;
        setNotifMaintenance(s.notifMaintenance ?? DEFAULT_SETTINGS.notifMaintenance);
        setNotifReports(s.notifReports ?? DEFAULT_SETTINGS.notifReports);
        setNotifSupply(s.notifSupply ?? DEFAULT_SETTINGS.notifSupply);
        setNotifLowStock(s.notifLowStock ?? DEFAULT_SETTINGS.notifLowStock);
        setSessionTimeout(s.sessionTimeout ?? DEFAULT_SETTINGS.sessionTimeout);
        setDateFormat(s.dateFormat ?? DEFAULT_SETTINGS.dateFormat);
        setLoadError("");
      } catch (err) {
        if (cancelled) return;
        setLoadError(err.message || "Failed to load settings. Showing defaults.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // ---- save changes ----------------------------------------------------------
  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    const nextSettings = {
      notifMaintenance,
      notifReports,
      notifSupply,
      notifLowStock,
      sessionTimeout,
      dateFormat,
    };

    try {
      await updateSettings(nextSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Keep the cached user object (and anything reading it — the
      // session-timeout timer, notification filtering) in sync without
      // requiring a re-login.
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored) {
          const updatedUser = { ...stored, settings: nextSettings };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch {
        // localStorage read/parse failing here is non-fatal — the save
        // itself already succeeded server-side.
      }

      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: nextSettings }));
    } catch (err) {
      setSaveError(err.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return {
    // notifications
    notifMaintenance,
    setNotifMaintenance,
    notifReports,
    setNotifReports,
    notifSupply,
    setNotifSupply,
    notifLowStock,
    setNotifLowStock,

    // security / regional
    sessionTimeout,
    setSessionTimeout,
    dateFormat,
    setDateFormat,

    // password dialog
    pwDialogOpen,
    openPasswordDialog,
    closePasswordDialog,

    // load / save status
    loading,
    loadError,
    saving,
    saveError,
    saveSuccess,

    // save
    handleSaveChanges,
  };
};