import { useEffect, useRef, useState, type ReactNode } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import { Section, Strip, type StripItem } from "./Detail";

interface PagedStripProps {
  title: string;
  items: StripItem[];
  // Links beside the title, before < and > ("View all").
  action?: ReactNode;
}

// An Overview row: a titled Strip paged with < and > beside the title instead of a scrollbar,
// as VideoGameTrackarr's Overview rows (CardCarousel) are.
const PagedStrip = ({ title, items, action }: PagedStripProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 0);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  // Whether the row overflows (and so whether > is enabled) changes with its items and the
  // window's width.
  useEffect(updateScrollState, [items.length]);
  useEffect(() => {
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, []);

  const scrollByPage = (direction: 1 | -1) =>
    scrollRef.current?.scrollBy({
      left: direction * scrollRef.current.clientWidth,
      behavior: "smooth",
    });

  return (
    <Section
      title={title}
      action={
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          {action}
          <IconButton
            size="small"
            onClick={() => scrollByPage(-1)}
            disabled={atStart}
            aria-label={t("common.scrollPrevious")}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => scrollByPage(1)}
            disabled={atEnd}
            aria-label={t("common.scrollNext")}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      <Strip items={items} scrollRef={scrollRef} onScroll={updateScrollState} paged />
    </Section>
  );
};

export default PagedStrip;
