import { ToastContainer, type IconProps, type TypeOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/ErrorOutline";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import WarningIcon from "@mui/icons-material/WarningAmber";
import GlobalStyles from "@mui/material/GlobalStyles";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

const ICONS: Record<TypeOptions, React.ReactNode> = {
  success: <CheckCircleIcon fontSize="small" />,
  error: <ErrorIcon fontSize="small" />,
  warning: <WarningIcon fontSize="small" />,
  info: <InfoIcon fontSize="small" />,
  default: <InfoIcon fontSize="small" />,
};

const CloseButton = ({
  closeToast,
}: {
  closeToast?: (event: React.MouseEvent<HTMLElement>) => void;
}) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="dct-toast-close"
      aria-label={t("listToolbar.close")}
      onClick={closeToast}
    >
      <CloseIcon sx={{ fontSize: 16 }} />
    </button>
  );
};

// The app's toasts in the redesign's style: a flat surface card with a hairline border, the
// type's colour as a thin bar on the left and on its icon, and a hairline progress line —
// bottom right on desktop, full width at the bottom on phones, clear of the header.
const Toasts = () => {
  const theme = useTheme();
  const { dct } = theme.palette;
  const typeColors: Record<string, string> = {
    success: dct.owned,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.primary.main,
    default: theme.palette.primary.main,
  };

  return (
    <>
      <GlobalStyles
        styles={{
          ".Toastify__toast-container": {
            "--toastify-font-family": theme.typography.fontFamily,
            "--toastify-toast-min-height": "48px",
            "--toastify-toast-bd-radius": "10px",
            "--toastify-toast-width": "360px",
            "--toastify-z-index": String(theme.zIndex.snackbar),
            padding: 0,
          },
          ".Toastify__toast": {
            position: "relative",
            overflow: "hidden",
            alignItems: "flex-start",
            gap: 10,
            padding: "11px 10px 11px 14px",
            marginBottom: 10,
            background: dct.surface,
            color: theme.palette.text.primary,
            border: `1px solid ${dct.borderStrong}`,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 12px 32px rgba(0,0,0,.45)"
                : "0 12px 32px rgba(20,24,32,.14)",
            fontSize: 13.5,
            lineHeight: 1.45,
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: "var(--dct-toast-color)",
            },
          },
          ".Toastify__toast-body": { padding: 0, margin: 0, alignItems: "flex-start" },
          ".Toastify__toast-icon": {
            width: 20,
            marginInlineEnd: 10,
            marginTop: 0,
            color: "var(--dct-toast-color)",
          },
          ...Object.fromEntries(
            Object.entries(typeColors).map(([type, color]) => [
              `.Toastify__toast--${type}`,
              { "--dct-toast-color": color },
            ])
          ),
          ".Toastify__progress-bar": {
            height: 2,
            background: "var(--dct-toast-color)",
            opacity: "0.5 !important",
          },
          ".Toastify__progress-bar--bg": { background: "transparent" },
          ".dct-toast-close": {
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            width: 24,
            height: 24,
            marginTop: -2,
            padding: 0,
            border: 0,
            borderRadius: 6,
            background: "transparent",
            color: dct.text3,
            cursor: "pointer",
            "&:hover": { background: dct.surfaceHover, color: theme.palette.text.primary },
            "&:focus-visible": {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 1,
            },
          },
          // Phones (react-toastify's own breakpoint): full width less a 10px gutter each side.
          "@media only screen and (max-width: 480px)": {
            ".Toastify__toast-container": {
              width: "100vw",
              boxSizing: "border-box",
              padding: "0 10px",
              left: 0,
              right: "auto",
              bottom: 10,
            },
            ".Toastify__toast": {
              width: "100%",
              maxWidth: "none",
              borderRadius: 10,
              marginBottom: 8,
            },
          },
        }}
      />
      <ToastContainer
        position="bottom-right"
        theme={theme.palette.mode}
        icon={({ type }: IconProps) => ICONS[type] ?? ICONS.default}
        closeButton={CloseButton}
        newestOnTop
        limit={4}
      />
    </>
  );
};

export default Toasts;
