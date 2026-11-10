import { describe, expect, it } from "vitest";
import { phoneColumns, phoneGridColumns } from "../VirtualCarGrid";

describe("phoneColumns", () => {
  it("maps the card size to 3, 2 or 1 columns on phones", () => {
    expect(phoneColumns(140)).toBe(3);
    expect(phoneColumns(150)).toBe(3);
    expect(phoneColumns(190)).toBe(2);
    expect(phoneColumns(220)).toBe(2);
    expect(phoneColumns(230)).toBe(2);
    expect(phoneColumns(240)).toBe(1);
    expect(phoneColumns(300)).toBe(1);
  });

  it("gives the matching CSS grid columns", () => {
    expect(phoneGridColumns(140)).toBe("repeat(3, minmax(0, 1fr))");
    expect(phoneGridColumns(300)).toBe("repeat(1, minmax(0, 1fr))");
  });
});
