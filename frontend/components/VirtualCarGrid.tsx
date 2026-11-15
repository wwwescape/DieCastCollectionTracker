import {
  useImperativeHandle,
  useLayoutEffect,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Box from "@mui/material/Box";
import { COLUMN_GAP_PX, phoneColumns, phoneGridColumns, useCardColumns } from "./cardColumns";

// Re-exported for the grids and tests that already import them from here.
export { phoneColumns, phoneGridColumns };

const ROW_GAP_PX = 18;
// Header + page toolbar + a little air, so a jumped-to row isn't hidden under them.
const STICKY_OFFSET_PX = 120;

export interface VirtualGridHandle {
  scrollToIndex: (index: number) => void;
}

interface VirtualCarGridProps<T> {
  items: T[];
  getKey: (item: T) => number;
  renderItem: (item: T) => ReactNode;
  // Smallest a card may get; as many columns as that allows in the page frame (Options → Card
  // size), whatever this grid's own width.
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
  // Columns come from the page frame's width (see useCardColumns), so every list agrees; the
  // grid's own width only sizes the cards within them.
  const { ref: containerRef, columns: sizedColumns } = useCardColumns(minItemWidth);
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
  }, [containerRef]);

  const columns = sizedColumns ?? 1;
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
