import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Box from "@mui/material/Box";

const COLUMN_GAP_PX = 16;
const ROW_GAP_PX = 18;
// Below this width there's no room to fit cards by size, so the card size picks a column count
// instead (phoneColumns).
const PHONE_WIDTH_PX = 600;
// Header + page toolbar + a little air, so a jumped-to row isn't hidden under them.
const STICKY_OFFSET_PX = 120;

// On phones, Options → Card size chooses 1, 2 or 3 columns: the smallest sizes 3, the default
// (190) 2, the largest sizes 1. Shared by every card grid with the slider, so they all agree.
export function phoneColumns(cardSize: number): number {
  if (cardSize < 160) return 3;
  if (cardSize <= 230) return 2;
  return 1;
}

// The CSS-grid equivalent, for grids that aren't windowed (CardGrid).
export const phoneGridColumns = (cardSize: number) =>
  `repeat(${phoneColumns(cardSize)}, minmax(0, 1fr))`;

export interface VirtualGridHandle {
  scrollToIndex: (index: number) => void;
}

interface VirtualCarGridProps<T> {
  items: T[];
  getKey: (item: T) => number;
  renderItem: (item: T) => ReactNode;
  // Smallest a card may get; the grid fits as many columns as that allows (Options → Card size).
  minItemWidth?: number;
  handleRef?: Ref<VirtualGridHandle>;
}

// A windowed grid for the card layout. Renders only the rows near the viewport (via the page's
// own scroll — see useWindowVirtualizer) regardless of collection size, so a collection of
// thousands costs the same DOM size as one of a few dozen.
function VirtualCarGrid<T>({
  items,
  getKey,
  renderItem,
  minItemWidth = 190,
  handleRef,
}: VirtualCarGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      setWidth(element.clientWidth);
      setScrollMargin(element.getBoundingClientRect().top + window.scrollY);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    // Content above the grid can change height without the grid resizing (a filter chip, the
    // search row wrapping on a phone); the body resizes with it, so watch that too and keep the
    // grid's offset — which the A–Z rail jumps by — current.
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const columns =
    width && width < PHONE_WIDTH_PX
      ? phoneColumns(minItemWidth)
      : Math.max(1, Math.floor((width + COLUMN_GAP_PX) / (minItemWidth + COLUMN_GAP_PX)));
  const itemWidth = width ? (width - COLUMN_GAP_PX * (columns - 1)) / columns : minItemWidth;

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    // 4:3 photo plus two text lines. The virtualizer corrects itself with measureElement once
    // real cards mount, so this only needs to be close.
    estimateSize: () => itemWidth * 0.75 + 48,
    lanes: columns,
    gap: ROW_GAP_PX,
    overscan: 4,
    scrollMargin,
    scrollPaddingStart: STICKY_OFFSET_PX,
    getItemKey: (index) => getKey(items[index]),
  });

  useImperativeHandle(handleRef, () => ({
    scrollToIndex: (index) => virtualizer.scrollToIndex(index, { align: "start" }),
  }));

  return (
    <Box
      ref={containerRef}
      sx={{ position: "relative", width: "100%", height: virtualizer.getTotalSize() }}
    >
      {width
        ? virtualizer.getVirtualItems().map((virtualItem) => (
            <Box
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              sx={{
                position: "absolute",
                top: 0,
                left: virtualItem.lane * (itemWidth + COLUMN_GAP_PX),
                width: itemWidth,
                transform: `translateY(${virtualItem.start - scrollMargin}px)`,
              }}
            >
              {renderItem(items[virtualItem.index])}
            </Box>
          ))
        : null}
    </Box>
  );
}

export default VirtualCarGrid;
