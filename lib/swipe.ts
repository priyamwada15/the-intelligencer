export type SwipeDirection = "prev" | "next";

export const SWIPE_THRESHOLD_PX = 80;

export function resolveSwipeDirection(
  deltaX: number,
  thresholdPx: number = SWIPE_THRESHOLD_PX,
): SwipeDirection | null {
  if (Math.abs(deltaX) <= thresholdPx) return null;
  return deltaX < 0 ? "next" : "prev";
}
