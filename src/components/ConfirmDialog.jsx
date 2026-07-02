import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

const ConfirmDialog = ({ open, title = "Confirm", message = "Are you sure?", onConfirm, onClose, confirmLabel = "Confirm", cancelLabel = "Cancel" }) => {
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  return (
    <Dialog open={!!open} onClose={onClose} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={handleConfirm} color="primary" variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
