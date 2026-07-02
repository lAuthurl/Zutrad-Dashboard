// ─────────────────────────────────────────────────────────────────────────────
// SignupPage.jsx  –  Pure UI. All logic and state is imported from useSignup.
//                    Add new UI sections here; wire state changes in useSignup.js.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Box, Typography, TextField, Button, Alert,
  MenuItem, IconButton, InputAdornment, Divider, useTheme,
} from "@mui/material";
import { Link } from "react-router-dom";
import VisibilityOutlinedIcon    from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import PersonAddOutlinedIcon     from "@mui/icons-material/PersonAddOutlined";

import { tokens } from "../../theme";
import { useSignup, ROLES } from "./signup.logic";


// ── SignupPage ─────────────────────────────────────────────────────────────────

const SignupPage = () => {
  const theme  = useTheme();
  const colors = tokens(theme.palette.mode);

  const {
    form, showPassword, showConfirm,
    error, success, loading, fieldErrors,
    handleChange, handleSubmit, handleBackToLogin,
    toggleShowPassword, toggleShowConfirm,
  } = useSignup();


  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Box display="flex" minHeight="100vh" backgroundColor={colors.primary[600]}>

      {/* ── left panel — branding (hidden on mobile) ──────────────────────────
          Background image + gradient overlay set via pseudo-elements.
          Copy text here reflects the access-request flow, not generic marketing. */}
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
          // background image layer
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
          // gradient overlay layer
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: `linear-gradient(145deg, ${colors.primary[500]}cc, ${colors.primary[700]}e6)`,
            zIndex: 1,
          },
        }}
      >
        {/* content sits above both pseudo-element layers */}
        <Box
          position="relative" zIndex={2}
          display="flex" flexDirection="column" alignItems="center" gap="16px"
        >
          {/* brand name */}
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

          {/* tagline */}
          <Typography
            color="#ffffff" fontSize="14px"
            textAlign="center" maxWidth="260px" lineHeight={1.7}
          >
            Access requests are reviewed by an administrator. You'll receive login credentials once approved.
          </Typography>

          {/* ── admin-only note card ──────────────────────────────────────────
              Update copy here if the admin creation flow changes. */}
          <Box
            mt="24px" p="16px 20px"
            backgroundColor={colors.primary[400]}
            borderRadius="8px"
            borderLeft={`3px solid ${colors.greenAccent[500]}`}
            maxWidth="260px"
          >
            <Typography color={colors.greenAccent[300]} fontWeight={700} fontSize="13px" mb="6px">
              Note
            </Typography>
            <Typography color="#ffffff" fontSize="12px" lineHeight={1.7}>
              Administrator accounts can only be created by an existing admin from the Admin Panel.
            </Typography>
          </Box>
        </Box>
      </Box>


      {/* ── right panel — signup form ─────────────────────────────────────────
          Switches between the form and a success state once submission completes. */}
      <Box
        flex={1}
        display="flex" flexDirection="column"
        justifyContent="center" alignItems="center"
        px={{ xs: "24px", sm: "48px" }}
        py="40px"
      >
        <Box width="100%" maxWidth="420px">

          {/* ── mobile-only brand heading ─────────────────────────────────── */}
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

          {/* ── icon badge ────────────────────────────────────────────────── */}
          <Box
            width="48px" height="48px" borderRadius="12px"
            display="flex" alignItems="center" justifyContent="center"
            mb="20px"
            sx={{
              background: `linear-gradient(135deg, ${colors.greenAccent[700]}, ${colors.blueAccent[700]})`,
            }}
          >
            <PersonAddOutlinedIcon sx={{ color: colors.grey[100], fontSize: "22px" }} />
          </Box>

          {/* ── heading ───────────────────────────────────────────────────── */}
          <Typography color={colors.grey[100]} fontWeight={700} fontSize="22px" mb="4px">
            Request Access
          </Typography>
          <Typography color={colors.grey[400]} fontSize="13px" mb="24px">
            Fill in your details - an admin will review and activate your account.
          </Typography>


          {/* ── success state ─────────────────────────────────────────────────
              Shown after a successful submission. Replace Alert copy and button
              behaviour here when real email notifications are wired up. */}
          {success ? (
            <Box>
              <Alert severity="success" sx={{ mb: "20px", fontSize: "13px" }}>
                Request submitted! An administrator will review your account and send your login credentials.
              </Alert>
              <Button
                fullWidth variant="contained"
                onClick={handleBackToLogin}
                sx={{
                  py: "11px", fontWeight: 700, fontSize: "14px",
                  textTransform: "none", borderRadius: "8px",
                  background: `linear-gradient(90deg, ${colors.greenAccent[600]}, ${colors.blueAccent[600]})`,
                }}
              >
                Back to Login
              </Button>
            </Box>

          ) : (

            /* ── form state ───────────────────────────────────────────────────
                Add new fields here and mirror them in EMPTY_FORM / handleSubmit
                inside useSignup.js. */
            <>
              {/* validation / auth error alert */}
              {error && (
                <Alert severity="error" sx={{ mb: "16px", fontSize: "13px" }}>{error}</Alert>
              )}

              <Box
                component="form" onSubmit={handleSubmit}
                display="flex" flexDirection="column" gap="13px"
              >
                {/* ── name row ─────────────────────────────────────────────── */}
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap="13px">
                  <TextField
                    variant="filled" label="First Name" name="firstName"
                    value={form.firstName} onChange={handleChange} fullWidth
                    error={fieldErrors.firstName}
                  />
                  <TextField
                    variant="filled" label="Surname" name="surname"
                    value={form.surname} onChange={handleChange} fullWidth
                    error={fieldErrors.surname}
                  />
                </Box>

                {/* ── email ────────────────────────────────────────────────── */}
                <TextField
                  variant="filled" label="Email address" name="email" type="email"
                  value={form.email} onChange={handleChange} fullWidth
                  error={fieldErrors.email}
                />

                {/* ── role select ───────────────────────────────────────────── */}
                <TextField
                  select variant="filled" label="Your Role" name="role"
                  value={form.role} onChange={handleChange} fullWidth
                  error={fieldErrors.role}
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </MenuItem>
                  ))}
                </TextField>

                {/* ── password ──────────────────────────────────────────────── */}
                <TextField
                  variant="filled" label="Password" name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password} onChange={handleChange} fullWidth
                  helperText="Minimum 8 characters"
                  error={fieldErrors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small" onClick={toggleShowPassword}
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

                {/* ── confirm password ──────────────────────────────────────── */}
                <TextField
                  variant="filled" label="Confirm Password" name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword} onChange={handleChange} fullWidth
                  error={fieldErrors.confirmPassword}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small" onClick={toggleShowConfirm}
                          sx={{ color: colors.grey[400] }}
                        >
                          {showConfirm
                            ? <VisibilityOffOutlinedIcon />
                            : <VisibilityOutlinedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* ── submit button ─────────────────────────────────────────── */}
                <Button
                  type="submit" variant="contained" fullWidth disabled={loading}
                  sx={{
                    mt: "4px", py: "11px",
                    fontWeight: 700, fontSize: "14px",
                    textTransform: "none", borderRadius: "8px",
                    background: `linear-gradient(90deg, ${colors.greenAccent[600]}, ${colors.blueAccent[600]})`,
                    "&:hover": {
                      background: `linear-gradient(90deg, ${colors.greenAccent[500]}, ${colors.blueAccent[500]})`,
                    },
                  }}
                >
                  {loading ? "Submitting…" : "Submit Request"}
                </Button>
              </Box>
            </>
          )}

          {/* ── divider ───────────────────────────────────────────────────── */}
          <Divider sx={{ my: "24px", borderColor: colors.primary[300] }} />

          {/* ── sign-in footer ────────────────────────────────────────────── */}
          <Typography color={colors.grey[400]} fontSize="13px" textAlign="center">
            Already have an account?{" "}
            <Typography
              component={Link} to="/login"
              color={colors.greenAccent[400]} fontSize="13px"
              sx={{ textDecoration: "none", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            >
              Sign in
            </Typography>
          </Typography>

        </Box>
      </Box>

    </Box>
  );
};

export default SignupPage;