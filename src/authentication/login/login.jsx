// ─────────────────────────────────────────────────────────────────────────────
// LoginPage.jsx  –  Pure UI. All logic and state is imported from useLogin.
//                   Add new UI sections here; wire state changes in useLogin.js.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Box, Typography, TextField, Button, Alert,
  IconButton, InputAdornment, Divider, useTheme,
  LinearProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityOutlinedIcon    from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LockOutlinedIcon          from "@mui/icons-material/LockOutlined";
import LockPersonOutlinedIcon    from "@mui/icons-material/LockPersonOutlined";
import TimerOutlinedIcon         from "@mui/icons-material/TimerOutlined";

import { tokens } from "../../theme";
import { useLogin } from "./login.logic";


// ── feature list shown on the left branding panel ────────────────────────────
const FEATURE_LIST = [
  "Client & Machine Tracking",
  "Field Reports & Maintenance",
  "Supply Chain Logging",
  "Role-Based Access Control",
];


// ── LoginPage ─────────────────────────────────────────────────────────────────

const LoginPage = ({ onLogin }) => {
  const theme  = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    form, showPassword, error, loading,
    emailError, passError,
    isLockedOut, lockoutSeconds, attempts, maxAttempts,
    handleChange, handleSubmit, toggleShowPassword,
  } = useLogin({ onLogin });

  // ── derived UI helpers ──────────────────────────────────────────────────────
  // Show attempt warning when user has made at least 1 failure but isn't locked yet
  const showAttemptWarning = attempts > 0 && !isLockedOut;
  const attemptsLeft       = maxAttempts - attempts;
  // Progress bar fills up as attempts increase (0% = fresh, 100% = locked)
  const lockoutProgress    = Math.min((attempts / maxAttempts) * 100, 100);


  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Box display="flex" minHeight="100vh" backgroundColor={colors.primary[600]}>

      {/* ── left panel — branding ─────────────────────────────────────────── */}
      <Box
        flex={1}
        display={{ xs: "none", md: "flex" }}
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        gap="16px"
        position="relative"
        sx={{
          backgroundColor: colors.primary[600],
          borderRight: `1px solid ${colors.primary[400]}`,
          px: "48px",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage: `url(/assets/zutrad-home-banner1-scaled.jpg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `linear-gradient(145deg, ${colors.primary[500]}cc, ${colors.primary[700]}e6)`,
            zIndex: 1,
          },
        }}
      >
        <Box
          position="relative" zIndex={2}
          display="flex" flexDirection="column" alignItems="center" gap="16px"
        >
          <Typography
            fontWeight={900} fontSize="36px"
            letterSpacing="0.12em" textAlign="center"
            sx={{
              background: `linear-gradient(90deg, ${colors.greenAccent[400]}, ${colors.blueAccent[300]})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ZUTRAD
            <br />
            VENTURES LTD
          </Typography>

          <Typography
            color="#ffffff" fontSize="14px"
            textAlign="center" maxWidth="260px" lineHeight={1.7}
          >
            Industrial coding & marking machine management platform for Nigerian manufacturing.
          </Typography>

          <Box mt="32px" display="flex" flexDirection="column" gap="10px" width="100%" maxWidth="260px">
            {FEATURE_LIST.map((f) => (
              <Box key={f} display="flex" alignItems="center" gap="10px">
                <Box
                  width="6px" height="6px" borderRadius="50%"
                  backgroundColor={colors.greenAccent[400]} flexShrink={0}
                />
                <Typography color="#ffffff" fontSize="13px">{f}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>


      {/* ── right panel — login form ──────────────────────────────────────── */}
      <Box
        flex={1}
        display="flex" flexDirection="column"
        justifyContent="center" alignItems="center"
        px={{ xs: "24px", sm: "48px" }}
      >
        <Box width="100%" maxWidth="400px">

          {/* mobile brand heading */}
          <Typography
            display={{ xs: "block", md: "none" }}
            fontWeight={900} fontSize="22px"
            letterSpacing="0.10em" textAlign="center" mb="32px"
            sx={{
              background: `linear-gradient(90deg, ${colors.greenAccent[400]}, ${colors.blueAccent[300]})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ZUTRAD VENTURES LTD
          </Typography>

          {/* lock icon badge — swaps to locked icon when locked out */}
          <Box
            width="48px" height="48px" borderRadius="12px"
            display="flex" alignItems="center" justifyContent="center"
            mb="20px"
            sx={{
              background: isLockedOut
                ? `linear-gradient(135deg, #b71c1c, #e53935)`
                : `linear-gradient(135deg, ${colors.greenAccent[700]}, ${colors.blueAccent[700]})`,
              transition: "background 0.3s ease",
            }}
          >
            {isLockedOut
              ? <LockPersonOutlinedIcon sx={{ color: "#fff", fontSize: "22px" }} />
              : <LockOutlinedIcon       sx={{ color: colors.grey[100], fontSize: "22px" }} />
            }
          </Box>

          {/* heading */}
          <Typography color={colors.grey[100]} fontWeight={700} fontSize="22px" mb="4px">
            Welcome back
          </Typography>
          <Typography color={colors.grey[400]} fontSize="13px" mb="28px">
            Sign in to your account to continue
          </Typography>

          {/* ── lockout banner ─────────────────────────────────────────────── */}
          {isLockedOut && (
            <Alert
              severity="error"
              icon={<TimerOutlinedIcon fontSize="inherit" />}
              sx={{ mb: "16px", fontSize: "13px", alignItems: "center" }}
            >
              <strong>Account temporarily locked.</strong> Too many failed attempts.{" "}
              Try again in <strong>{lockoutSeconds}s</strong>.
            </Alert>
          )}

          {/* ── attempt warning (not yet locked) ──────────────────────────── */}
          {showAttemptWarning && (
            <Box mb="16px">
              <Alert severity="warning" sx={{ fontSize: "13px", mb: "8px" }}>
                {attemptsLeft === 1
                  ? "1 attempt remaining before your account is temporarily locked."
                  : `${attemptsLeft} attempts remaining.`}
              </Alert>
              {/* progress bar — fills red as attempts increase */}
              <LinearProgress
                variant="determinate"
                value={lockoutProgress}
                sx={{
                  height: "4px",
                  borderRadius: "2px",
                  backgroundColor: colors.primary[400],
                  "& .MuiLinearProgress-bar": {
                    backgroundColor:
                      attemptsLeft <= 1 ? "#e53935"
                      : attemptsLeft <= 2 ? "#ff9800"
                      : colors.greenAccent[500],
                  },
                }}
              />
            </Box>
          )}

          {/* ── general error alert (wrong creds, network, etc.) ──────────── */}
          {error && !isLockedOut && !showAttemptWarning && (
            <Alert severity="error" sx={{ mb: "16px", fontSize: "13px" }}>
              {error}
            </Alert>
          )}

          {/* ── form ──────────────────────────────────────────────────────── */}
          <Box
            component="form" onSubmit={handleSubmit}
            display="flex" flexDirection="column" gap="14px"
          >
            {/* email */}
            <TextField
              variant="filled"
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              autoComplete="email"
              error={emailError}
              disabled={isLockedOut}
            />

            {/* password */}
            <TextField
              variant="filled"
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              fullWidth
              autoComplete="current-password"
              error={passError}
              disabled={isLockedOut}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={toggleShowPassword}
                      disabled={isLockedOut}
                      sx={{ color: colors.grey[400] }}
                    >
                      {showPassword
                        ? <VisibilityOffOutlinedIcon />
                        : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* forgot password */}
            <Box display="flex" justifyContent="flex-end">
              <Typography
                component={Link} to="/forgot-password"
                color={colors.blueAccent[300]} fontSize="12px"
                sx={{ textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                Forgot password?
              </Typography>
            </Box>

            {/* submit button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || isLockedOut}
              sx={{
                mt: "4px", py: "11px",
                fontWeight: 700, fontSize: "14px",
                textTransform: "none", borderRadius: "8px",
                background: isLockedOut
                  ? "#555"
                  : `linear-gradient(90deg, ${colors.greenAccent[600]}, ${colors.blueAccent[600]})`,
                "&:hover": {
                  background: isLockedOut
                    ? "#555"
                    : `linear-gradient(90deg, ${colors.greenAccent[500]}, ${colors.blueAccent[500]})`,
                },
                transition: "background 0.3s ease",
              }}
            >
              {isLockedOut
                ? `Locked — wait ${lockoutSeconds}s`
                : loading
                ? "Signing in…"
                : "Sign in"}
            </Button>
          </Box>

          <Divider sx={{ my: "24px", borderColor: colors.primary[300] }} />

          {/* request access footer */}
          <Typography color={colors.grey[400]} fontSize="13px" textAlign="center">
            Don't have an account?{" "}
            <Typography
              component={Link} to="/signup"
              color={colors.greenAccent[400]} fontSize="13px"
              sx={{ textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            >
              Request access
            </Typography>
          </Typography>

        </Box>
      </Box>

    </Box>
  );
};

export default LoginPage;