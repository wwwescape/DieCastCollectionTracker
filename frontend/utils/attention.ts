import type { Car } from "../api/types";

// Gaps worth filling in, shown on the Overview and applied as a one-off filter on the
// Vehicles list (on top of the regular filters, client-side).
export const ATTENTION_KINDS = ["noPhoto", "notMatched", "noCondition", "noToyNumber"] as const;
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export const ATTENTION_CHECKS: Record<AttentionKind, (car: Car) => boolean> = {
  noPhoto: (car) => !car.photo,
  notMatched: (car) => !car.catalogTitle,
  // Only owned vehicles have a condition worth recording.
  noCondition: (car) => car.status === "owned" && !car.condition,
  noToyNumber: (car) => !car.castNumber,
};

export function isAttentionKind(value: unknown): value is AttentionKind {
  return typeof value === "string" && (ATTENTION_KINDS as readonly string[]).includes(value);
}
