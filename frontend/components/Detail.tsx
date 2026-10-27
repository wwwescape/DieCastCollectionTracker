import { Fragment, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Crumb } from "./Page";
import PhotoImg from "./PhotoImg";
import { openedFrom } from "../utils/navState";

// Building blocks for the vehicle and set detail pages (see mockup/vehicle.html): a hero with
// the photo over a blurred copy of itself, then titled sections of facts and photo strips.

interface DetailHeroProps {
  photo: string | null;
  crumbs: Crumb[];
  title: string;
  subline: ReactNode[];
  pills: ReactNode;
}

export const DetailHero = ({ photo, crumbs, title, subline, pills }: DetailHeroProps) => (
  <Box
    component="section"
    sx={{
      position: "relative",
      overflow: "hidden",
      borderBottom: 1,
      borderColor: "divider",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: (theme) =>
          `linear-gradient(180deg, transparent 0%, ${theme.palette.background.default} 100%)`,
      },
    }}
  >
    {photo ? (
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: -40,
          backgroundImage: `url("${photo}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(36px) saturate(1.3)",
          opacity: 0.35,
        }}
      />
    ) : null}
    <Box
      sx={{
        position: "relative",
        zIndex: 1,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "360px 1fr" },
        gap: { xs: 2, md: 3.5 },
        alignItems: "end",
        p: { xs: 2, md: 3.5 },
        pb: { md: 3 },
      }}
    >
      <Box
        sx={{
          aspectRatio: "4 / 3",
          borderRadius: 2.5,
          overflow: "hidden",
          bgcolor: "dct.photoBg",
          boxShadow: "0 18px 40px rgba(0,0,0,.35)",
          display: "grid",
          placeItems: "center",
          maxWidth: { xs: 420, md: "none" },
        }}
      >
        <PhotoImg src={photo} alt={title} iconSize={48} sx={{ p: 1.25 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box
          component="nav"
          aria-label="Breadcrumb"
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            mb: 1,
            fontSize: 13,
            color: "dct.text3",
          }}
        >
          {crumbs.map((crumb, index) => (
            <Fragment key={index}>
              {index > 0 ? <span aria-hidden>›</span> : null}
              {crumb.to ? (
                <Box
                  component={Link}
                  to={crumb.to}
                  sx={{
                    color: "inherit",
                    textDecoration: "none",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  {crumb.label}
                </Box>
              ) : (
                <span>{crumb.label}</span>
              )}
            </Fragment>
          ))}
        </Box>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: 26, md: 34 }, lineHeight: 1.1, mb: 1, wordBreak: "break-word" }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
            color: "text.secondary",
            fontSize: 15,
            mb: 1.75,
          }}
        >
          {subline.filter(Boolean).map((part, index) => (
            <Fragment key={index}>
              {index > 0 ? (
                <Box component="span" sx={{ color: "dct.text3" }}>
                  ·
                </Box>
              ) : null}
              <span>{part}</span>
            </Fragment>
          ))}
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>{pills}</Box>
      </Box>
    </Box>
  </Box>
);

// Hero pill tones, as in VideoGameTrackarr: owned in green, wishlisted in pink.
const PILL_TONES = {
  owned: { border: "rgba(63,178,127,.45)", bg: "rgba(63,178,127,.12)", color: "dct.owned" },
  wishlist: { border: "rgba(255,107,139,.45)", bg: "rgba(255,107,139,.12)", color: "dct.wishlist" },
  accent: { border: "primary.main", bg: "dct.accentSoft", color: "text.primary" },
} as const;

interface PillProps {
  icon?: ReactNode;
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  href?: string;
  to?: string;
}

// Rounded fact chip in the hero (status, condition, toy number, tags...).
export const Pill = ({ icon, children, tone, href, to }: PillProps) => {
  const link = href
    ? { component: "a", href, target: "_blank", rel: "noopener noreferrer" }
    : to
      ? { component: Link, to }
      : {};
  return (
    <Box
      component="span"
      {...link}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.625,
        height: 28,
        px: 1.25,
        borderRadius: 3.5,
        fontSize: 12.5,
        fontWeight: 500,
        whiteSpace: "nowrap",
        textDecoration: "none",
        border: 1,
        borderColor: tone ? PILL_TONES[tone].border : "dct.border",
        bgcolor: tone ? PILL_TONES[tone].bg : "dct.surface2",
        color: tone ? PILL_TONES[tone].color : "text.primary",
        "& svg": { fontSize: 16 },
        ...(href || to ? { "&:hover": { borderColor: "primary.main" } } : {}),
      }}
    >
      {icon}
      {children}
    </Box>
  );
};

// A titled block with a hairline running out to the right, and an optional action at its end.
export const Section = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <Box component="section" sx={{ pt: { xs: 2.25, md: 2.75 } }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
      <Typography variant="overline" component="h2" sx={{ color: "dct.text3", lineHeight: 1.4 }}>
        {title}
      </Typography>
      <Box sx={{ flexGrow: 1, height: "1px", bgcolor: "divider" }} />
      {action}
    </Box>
    {children}
  </Box>
);

export const Facts = ({ facts }: { facts: [string, ReactNode][] }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
      gap: 1.25,
    }}
  >
    {facts
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([label, value]) => (
        <Box
          key={label}
          sx={{
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            px: 1.5,
            py: 1.25,
          }}
        >
          <Typography sx={{ fontSize: 11.5, color: "dct.text3" }}>{label}</Typography>
          <Typography sx={{ fontWeight: 600, mt: 0.25, wordBreak: "break-word" }}>
            {value}
          </Typography>
        </Box>
      ))}
  </Box>
);

export interface StripItem {
  key: string | number;
  to?: string;
  photo: string | null;
  title: string;
  subtitle?: string;
  // Green border: this one is in the collection.
  owned?: boolean;
}

// A sideways-scrolling row of small photo tiles (more from the series, linked sets...).
export const Strip = ({ items }: { items: StripItem[] }) => {
  const location = useLocation();
  return (
    <Box
      sx={{
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: 180,
        gap: 1.5,
        overflowX: "auto",
        pb: 0.75,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.key}
          {...(item.to ? { component: Link, to: item.to, state: openedFrom(location) } : {})}
          sx={{
            display: "block",
            bgcolor: "background.paper",
            border: 1,
            borderColor: item.owned ? "dct.owned" : "divider",
            borderRadius: 2,
            overflow: "hidden",
            color: "inherit",
            textDecoration: "none",
            "&:hover": item.to ? { borderColor: "primary.main" } : undefined,
          }}
        >
          <Box sx={{ aspectRatio: "4 / 3", bgcolor: "dct.photoBg" }}>
            <PhotoImg src={item.photo} />
          </Box>
          <Box sx={{ px: 1.25, py: 1, fontSize: 12.5 }}>
            <Box
              sx={{
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.title}
            </Box>
            {item.subtitle ? (
              <Box
                sx={{
                  color: "dct.text3",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.subtitle}
              </Box>
            ) : null}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
