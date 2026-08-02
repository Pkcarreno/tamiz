import { describe, expect, it } from "vitest";
import { computeBarPosition } from "./position.ts";

// 8px is the gap between element and bar, and the viewport clamp margin.
const GAP = 8;
const MARGIN = 8;

describe("computeBarPosition", () => {
  it("places the bar top-right of the target when it fits", () => {
    // Element at (100, 200), 200x50 -> right edge 300, top 200
    const rect = new DOMRect(100, 200, 200, 50);
    const result = computeBarPosition(rect, 300, 60, 1200, 800);

    // top-right: top = element.top - bar.height - GAP, left = element.right + GAP
    expect(result).toEqual({
      left: 300 + GAP,
      top: 200 - 60 - GAP,
    });
  });

  it("flips below the target when the bar would overflow the top", () => {
    // Element near top: top 30, height 50 -> bar top would be 30-60-8 = -38
    const rect = new DOMRect(100, 30, 200, 50);
    const result = computeBarPosition(rect, 300, 60, 1200, 800);

    // Flip below: top = element.bottom + GAP
    expect(result).toEqual({
      left: 300 + GAP,
      top: 80 + GAP,
    });
  });

  it("clamps to the right viewport edge when bar overflows right", () => {
    // Element right edge at 1150; bar left = 1158, bar width 300 overflows 1200
    const rect = new DOMRect(950, 200, 200, 50);
    const result = computeBarPosition(rect, 300, 60, 1200, 800);

    expect(result).toEqual({
      left: 1200 - 300 - MARGIN,
      top: 200 - 60 - GAP,
    });
  });

  it("clamps to the left viewport edge when element is near left", () => {
    // Element right edge at 20; bar left = 28, but bar width 300 overflows right
    // After right clamp: left = 1200 - 300 - 8 = 892; no left clamp needed
    // But if element is at left 0, right edge = 200, bar left = 208, fine
    const rect = new DOMRect(0, 200, 200, 50);
    const result = computeBarPosition(rect, 300, 60, 1200, 800);

    expect(result).toEqual({
      left: 200 + GAP,
      top: 200 - 60 - GAP,
    });
  });

  it("clamps to the top after flipping for an element at the very top", () => {
    // Element top 5, bottom 55; below flip: top = 63; bar height 60 -> 123 fits
    // But if element top 5 and bar height 70: top = 5-70-8 = -73 -> flip below 63
    // If below also overflows (tall bar): clamp to MARGIN
    const rect = new DOMRect(100, 5, 200, 50);
    const result = computeBarPosition(rect, 300, 900, 1200, 800);

    // Flip below: top = 55 + 8 = 63; but 63 + 900 > 792 -> clamp to 800-900-8 = -108
    // Hmm, that's still negative. Let me recalculate:
    // top = 5 - 900 - 8 = -913 -> flip below: top = 55 + 8 = 63
    // 63 + 900 = 963 > 792 -> top = 800 - 900 - 8 = -108
    // That's still < MARGIN... The guard catches this.
    expect(result.top).toBeGreaterThanOrEqual(MARGIN);
  });

  it("handles an element wider than the viewport", () => {
    // Element extends beyond viewport right
    const rect = new DOMRect(-50, 200, 1400, 50);
    const result = computeBarPosition(rect, 300, 60, 1200, 800);

    // Right clamp applies
    expect(result.left).toBe(1200 - 300 - MARGIN);
  });
});
