// ─────────────────────────────────────────────────────────────────────────────
// useLogin.js  –  All state and handlers for LoginPage.
//                 No JSX lives here.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

// ── security constants ────────────────────────────────────────────────────────
const MAX_ATTEMPTS      = 5;    // lockout after this many consecutive failures
const LOCKOUT_SECONDS   = 60;   // how long the lockout lasts
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // reset attempt count after 15 min of no tries

// ── email regex (RFC-5322 simplified but stricter than just checking "@") ─────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── storage keys ──────────────────────────────────────────────────────────────
const STORAGE_ATTEMPT_KEY = "ztrd_login_attempts";
const STORAGE_LOCKOUT_KEY = "ztrd_lockout_until";

// ── helpers ───────────────────────────────────────────────────────────────────

const getAttemptData = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ATTEMPT_KEY)) || { count: 0, lastAt: 0 };
  } catch {
    return { count: 0, lastAt: 0 };
  }
};

const getLockoutUntil = () => {
  const val = parseInt(localStorage.getItem(STORAGE_LOCKOUT_KEY) || "0", 10);
  return isNaN(val) ? 0 : val;
};

const clearAttempts = () => {
  localStorage.removeItem(STORAGE_ATTEMPT_KEY);
  localStorage.removeItem(STORAGE_LOCKOUT_KEY);
};

// Sanitise input — strip leading/trailing whitespace and collapse internal
// whitespace to a single space. Prevents whitespace-stuffing tricks.
const sanitise = (str) => str.trim().replace(/\s+/g, " ");

// ── main hook ─────────────────────────────────────────────────────────────────

export const useLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // ── form state ──────────────────────────────────────────────────────────────
  const [form, setForm]                     = useState({ email: "", password: "" });
  const [showPassword, setShowPassword]     = useState(false);
  const [error, setError]                   = useState("");
  const [loading, setLoading]               = useState(false);

  // ── rate-limit / lockout state ─────────────────────────────────────────────
  const [attempts, setAttempts]             = useState(() => getAttemptData().count);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const isLockedOut = lockoutSeconds > 0;


  // ── lockout countdown ──────────────────────────────────────────────────────
  // On mount check if a lockout is still active and resume the countdown.
  useEffect(() => {
    const tick = () => {
      const remaining = Math.ceil((getLockoutUntil() - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutSeconds(remaining);
        setError(`Too many failed attempts. Try again in ${remaining}s.`);
      } else {
        setLockoutSeconds(0);
        setError("");
        clearInterval(timerRef.current);
      }
    };

    const until = getLockoutUntil();
    if (until > Date.now()) {
      tick();
      timerRef.current = setInterval(tick, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, []);


  // ── attempt window expiry ──────────────────────────────────────────────────
  // If the user last tried more than ATTEMPT_WINDOW_MS ago, reset the counter.
  useEffect(() => {
    const { lastAt } = getAttemptData();
    if (lastAt && Date.now() - lastAt > ATTEMPT_WINDOW_MS) {
      clearAttempts();
      setAttempts(0);
    }
  }, []);


  // ── record a failed attempt ────────────────────────────────────────────────
  const recordFailure = useCallback(() => {
    const { count } = getAttemptData();
    const next = count + 1;
    localStorage.setItem(STORAGE_ATTEMPT_KEY, JSON.stringify({ count: next, lastAt: Date.now() }));
    setAttempts(next);

    if (next >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_SECONDS * 1000;
      localStorage.setItem(STORAGE_LOCKOUT_KEY, String(until));
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((getLockoutUntil() - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutSeconds(remaining);
          setError(`Too many failed attempts. Try again in ${remaining}s.`);
        } else {
          setLockoutSeconds(0);
          setError("");
          clearAttempts();
          setAttempts(0);
          clearInterval(timerRef.current);
        }
      }, 1000);
    }
  }, []);


  // ── handlers ───────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    if (!isLockedOut) setError("");
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const toggleShowPassword = () => setShowPassword((v) => !v);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ── guard: locked out ────────────────────────────────────────────────────
    if (isLockedOut) return;

    // ── client-side validation ───────────────────────────────────────────────
    const email    = sanitise(form.email);
    const password = form.password; // never trim passwords

    if (!email) {
      setError("Email address is required.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address (e.g. name@company.com).");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
        // Abort after 10s so a hung server doesn't block the UI forever
        signal: AbortSignal.timeout(10_000),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Generic message — avoids user enumeration
          // (don't reveal whether the email exists or the password was wrong)
          recordFailure();
          const fresh = getAttemptData().count;
          const remaining = MAX_ATTEMPTS - fresh;
          setError(
            remaining > 0
              ? `Incorrect email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "" // lockout message is set by recordFailure's interval
          );
        } else if (res.status === 403) {
          // Not a wrong-password failure — don't count against attempts
          setError(data.message || "Account not yet approved by an administrator.");
        } else {
          setError(data.message || "Login failed. Please try again.");
        }
        return;
      }

      // ── success ────────────────────────────────────────────────────────────
      clearAttempts();
      setAttempts(0);
      clearInterval(timerRef.current);

      // Validate response shape before trusting it
      if (!data.token || !data.user) {
        setError("Unexpected server response. Please try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
      navigate("/");

    } catch (err) {
      if (err.name === "AbortError" || err.name === "TimeoutError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError("Unable to reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };


  // ── field-level error flags (drives MUI error prop) ───────────────────────
  const emailError = !!error && (!form.email || !EMAIL_RE.test(sanitise(form.email)));
  const passError  = !!error && !form.password;


  // ── exposed API ───────────────────────────────────────────────────────────
  return {
    form,
    showPassword,
    error,
    loading,
    emailError,
    passError,
    isLockedOut,
    lockoutSeconds,
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    handleChange,
    handleSubmit,
    toggleShowPassword,
  };
};