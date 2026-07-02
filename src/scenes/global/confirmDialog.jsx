import { Dialog, DialogActions, Button, useTheme, Box, Typography, Slide } from "@mui/material";
import { forwardRef } from "react";
import { tokens } from "../theme";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

// Generic confirm dialog. Controlled entirely by props — pass it whatever
// `confirmState` your logic hook returns (open / title / message / onConfirm)
// plus a `onClose` to dismiss it.
//
// Usage:
//   <ConfirmDialog
//     open={confirmState.open}
//     title={confirmState.title}
//     message={confirmState.message}
//     onConfirm={confirmAction}
//     onClose={closeConfirmDialog}
//   />

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ConfirmDialog = ({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      slotProps={{
        backdrop: {
          sx: { backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" },
        },
      }}
      PaperProps={{
        sx: {
          backgroundColor: colors.primary[400],
          backgroundImage: "none",
          borderRadius: "12px",
          border: `1px solid ${colors.primary[300]}`,
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.5)",
          width: "380px",
          maxWidth: "90vw",
          overflow: "hidden",
        },
      }}
    >
      {/* top accent bar — signals destructive intent before any text is read */}
      <Box sx={{ height: "3px", backgroundColor: colors.redAccent[500] }} />

      <Box sx={{ p: "28px 26px 22px" }}>
        <Box display="flex" gap="16px" alignItems="flex-start">
          {/* icon badge */}
          <Box
            sx={{
              flexShrink: 0,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${colors.redAccent[900] ?? colors.redAccent[700]}55`,
              border: `1px solid ${colors.redAccent[700]}`,
            }}
          >
            <WarningAmberRoundedIcon sx={{ color: colors.redAccent[400], fontSize: "22px" }} />
          </Box>

          <Box flex={1} pt="2px">
            <Typography
              sx={{
                fontSize: "16px",
                fontWeight: 700,
                color: colors.grey[100],
                letterSpacing: "-0.01em",
                lineHeight: 1.3,
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                mt: "8px",
                fontSize: "13.5px",
                lineHeight: 1.55,
                color: colors.grey[400],
              }}
            >
              {message}
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogActions
        sx={{
          px: "26px",
          pb: "22px",
          pt: 0,
          gap: "10px",
        }}
      >
        <Button
          onClick={onClose}
          fullWidth
          sx={{
            color: colors.grey[200],
            backgroundColor: colors.primary[500],
            textTransform: "none",
            fontSize: "13.5px",
            fontWeight: 600,
            borderRadius: "8px",
            py: "9px",
            border: `1px solid ${colors.primary[300]}`,
            "&:hover": { backgroundColor: colors.primary[600] ?? colors.primary[500], borderColor: colors.grey[600] },
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          autoFocus
          fullWidth
          variant="contained"
          disableElevation
          sx={{
            backgroundColor: colors.redAccent[600],
            color: "#fff",
            textTransform: "none",
            fontSize: "13.5px",
            fontWeight: 600,
            borderRadius: "8px",
            py: "9px",
            "&:hover": { backgroundColor: colors.redAccent[700], boxShadow: `0 4px 14px ${colors.redAccent[700]}66` },
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;