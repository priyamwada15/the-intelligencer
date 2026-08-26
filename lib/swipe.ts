export type SwipeDirection = "prev" | "next";

export const SWIPE_THRESHOLD_PX = 80;

// A fast flick should commit even if it didn't travel past SWIPE_THRESHOLD_PX —
// momentum-based dismissal, matched against Motion's PanInfo.velocity (px/s).
export const SWIPE_VELOCITY_THRESHOLD = 500;

export function resolveSwipeDirection(
  deltaX: number,
  thresholdPx: number = SWIPE_THRESHOLD_PX,
  velocityX: number = 0,
  velocityThresholdPxPerSec: number = SWIPE_VELOCITY_THRESHOLD,
): SwipeDirection | null {
  if (Math.abs(deltaX) > thresholdPx) {
    return deltaX < 0 ? "next" : "prev";
  }
  if (Math.abs(velocityX) > velocityThresholdPxPerSec) {
    return velocityX < 0 ? "next" : "prev";
  }
  return null;
}
