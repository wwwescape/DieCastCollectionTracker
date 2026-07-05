import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmColor?: "primary" | "error";
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  confirmColor = "primary",
  onClose,
  onConfirm,
}: ConfirmDialogProps) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{description}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">
        Cancel
      </Button>
      <Button onClick={onConfirm} color={confirmColor} variant="contained">
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
