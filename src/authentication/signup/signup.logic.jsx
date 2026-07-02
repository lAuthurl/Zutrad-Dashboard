// ─────────────────────────────────────────────────────────────────────────────
// useSignup.js  –  All state, validation, and handlers for SignupPage.
//                  No JSX lives here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";


// ── selectable roles ──────────────────────────────────────────────────────────
// Add new roles here as the platform grows. Each value is used directly as the
// role field and displayed capitalised in the dropdown.
// NOTE: this list must stay in sync with ALLOWED_SIGNUP_ROLES on the backend
// (auth.routes.js) — if you add a role here, add it there too, and vice versa.

export const ROLES = ["engineer", "receptionist", "administrator"];


// ── security constants ────────────────────────────────────────────────────────
const MAX_ATTEMPTS      = 5;    // lockout after this many consecutive submit attempts
const LOCKOUT_SECONDS   = 60;   // how long the lockout lasts
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // reset attempt count after 15 min of no tries

const MAX_NAME_LENGTH = 50;     // sanity bound, not a real security control on its own

// ── email regex (same as useLogin.js — RFC-5322 simplified but stricter
//    than just checking for "@") ───────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── name regex — letters, spaces, hyphens, apostrophes only ──────────────────
// Blocks digits/symbols from sneaking into a name field. Unicode-aware so
// accented names (e.g. "Adebáyò") still pass.
const NAME_RE = /^[A-Za-z\u00C0-\u017F' -]+$/;

// ── storage keys (separate from useLogin's, so signup spam and login
//    brute-forcing are tracked independently) ─────────────────────────────────
const STORAGE_ATTEMPT_KEY = "ztrd_signup_attempts";
const STORAGE_LOCKOUT_KEY = "ztrd_signup_lockout_until";


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
// whitespace to a single space. Prevents whitespace-stuffing tricks and
// accidental "  John " style values reaching the API.
const sanitise = (str) => str.trim().replace(/\s+/g, " ");

// Quick password strength check beyond plain length. Still simple — this is
// a signup form, not a vault, but it catches the most obvious weak picks.
const isPasswordStrongEnough = (password) => {
  if (password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
};


// ── form initial state ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  firstName: "",
  surname: "",
  email: "",
  role: "",
  password: "",
  confirmPassword: "",
};


// ── main hook ─────────────────────────────────────────────────────────────────

export const useSignup = () => {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  // ── form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── ui state ────────────────────────────────────────────────────────────────
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── rate-limit / lockout state ─────────────────────────────────────────────
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const isLockedOut = lockoutSeconds > 0;


  // ── lockout countdown ──────────────────────────────────────────────────────
  // On mount check if a lockout is still active and resume the countdown.
  useEffect(() => {
    const tick = () => {
      const remaining = Math.ceil((getLockoutUntil() - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutSeconds(remaining);
        setError(`Too many attempts. Try again in ${remaining}s.`);
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
    }
  }, []);


  // ── record an attempt (success or failure — signup is rate-limited by
  //    submission frequency, not just failures, since each attempt hits
  //    the DB with a findOne + potential create) ─────────────────────────────
  const recordAttempt = useCallback(() => {
    const { count } = getAttemptData();
    const next = count + 1;
    localStorage.setItem(STORAGE_ATTEMPT_KEY, JSON.stringify({ count: next, lastAt: Date.now() }));

    if (next >= MAX_ATTEMPTS) {
      const until = Date.now() + LOCKOUT_SECONDS * 1000;
      localStorage.setItem(STORAGE_LOCKOUT_KEY, String(until));
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((getLockoutUntil() - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutSeconds(remaining);
          setError(`Too many attempts. Try again in ${remaining}s.`);
        } else {
          setLockoutSeconds(0);
          setError("");
          clearAttempts();
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
  const toggleShowConfirm  = () => setShowConfirm((v) => !v);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ── guard: locked out ────────────────────────────────────────────────────
    if (isLockedOut) return;

    // ── guard: already submitting (prevents double-click double-submit) ─────
    if (loading) return;

    const firstName       = sanitise(form.firstName);
    const surname          = sanitise(form.surname);
    const email             = sanitise(form.email);
    const role               = form.role;
    const password           = form.password;           // never trim passwords
    const confirmPassword    = form.confirmPassword;    // never trim passwords

    // ── validation — add new rules here ──────────────────────────────────────
    if (!firstName) {
      setError("First name is required.");
      return;
    }
    if (firstName.length > MAX_NAME_LENGTH || !NAME_RE.test(firstName)) {
      setError("First name contains invalid characters or is too long.");
      return;
    }
    if (!surname) {
      setError("Surname is required.");
      return;
    }
    if (surname.length > MAX_NAME_LENGTH || !NAME_RE.test(surname)) {
      setError("Surname contains invalid characters or is too long.");
      return;
    }
    if (!email) {
      setError("Email address is required.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address (e.g. name@company.com).");
      return;
    }
    if (!role || !ROLES.includes(role)) {
      setError("Please select a valid role.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (!isPasswordStrongEnough(password)) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    recordAttempt();

    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          surname,
          email: email.toLowerCase(),
          role,
          password,
        }),
        // Abort after 10s so a hung server doesn't block the UI forever
        signal: AbortSignal.timeout(10_000),
      });

      const data = await res.json();

      if (!res.ok) {
        // e.g. 409 email already registered, 400 bad input
        setError(data.message || "Signup failed. Please try again.");
        return;
      }

      // ── success: show confirmation state, no auto-login ───────────────────
      // User must wait for admin approval before they can log in.
      clearAttempts();
      setLockoutSeconds(0);
      clearInterval(timerRef.current);
      setSuccess(true);

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

  const handleBackToLogin = () => navigate("/login");


  // ── field-level error flags (drives MUI error prop) ───────────────────────

  const fieldErrors = {
    firstName:       !!error && (!form.firstName || !NAME_RE.test(sanitise(form.firstName || ""))),
    surname:         !!error && (!form.surname || !NAME_RE.test(sanitise(form.surname || ""))),
    email:           !!error && (!form.email || !EMAIL_RE.test(sanitise(form.email || ""))),
    role:            !!error && !ROLES.includes(form.role),
    password:        !!error && !isPasswordStrongEnough(form.password),
    confirmPassword: !!error && form.password !== form.confirmPassword,
  };


  // ── exposed API ───────────────────────────────────────────────────────────
  return {
    form,
    showPassword,
    showConfirm,
    error,
    success,
    loading,
    isLockedOut,
    lockoutSeconds,
    fieldErrors,
    handleChange,
    handleSubmit,
    handleBackToLogin,
    toggleShowPassword,
    toggleShowConfirm,
  };
};