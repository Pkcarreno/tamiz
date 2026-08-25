import { afterEach, describe, expect, it, vi } from "vitest";
import { createScrimController } from "./scrim.ts";

const SCRIM_ATTR = "data-tamiz-ui";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function getScrim(): HTMLDivElement | null {
  return document.body.querySelector<HTMLDivElement>(`[${SCRIM_ATTR}]`);
}

describe("ScrimController", () => {
  describe("show", () => {
    it("injects a div into document.body with data-tamiz-ui marker", () => {
      const scrim = createScrimController();
      scrim.show();
      const div = getScrim();
      expect(div).not.toBeNull();
      expect(div?.parentElement).toBe(document.body);
    });

    it("sets pointer-events: none so clicks pass through to the blocker", () => {
      const scrim = createScrimController();
      scrim.show();
      expect(getScrim()?.style.pointerEvents).toBe("none");
    });

    it("positions fixed to cover the viewport", () => {
      const scrim = createScrimController();
      scrim.show();
      expect(getScrim()?.style.position).toBe("fixed");
    });

    it("covers full viewport via inset: 0", () => {
      const scrim = createScrimController();
      scrim.show();
      expect(getScrim()?.style.inset).toBe("0px");
    });

    it("uses z-index 2147483646 (below shadow root UI at 2147483647)", () => {
      const scrim = createScrimController();
      scrim.show();
      expect(getScrim()?.style.zIndex).toBe("2147483646");
    });

    it("sets semi-transparent dark background", () => {
      const scrim = createScrimController();
      scrim.show();
      expect(getScrim()?.style.backgroundColor).toBe("rgba(0, 0, 0, 0.35)");
    });

    it("does not create a duplicate when show is called twice", () => {
      const scrim = createScrimController();
      scrim.show();
      scrim.show();
      expect(document.body.querySelectorAll(`[${SCRIM_ATTR}]`).length).toBe(1);
    });
  });

  describe("hide", () => {
    it("removes the scrim div from the DOM", () => {
      const scrim = createScrimController();
      scrim.show();
      expect(getScrim()).not.toBeNull();

      scrim.hide();
      expect(getScrim()).toBeNull();
    });

    it("is safe to call when no scrim is visible", () => {
      const scrim = createScrimController();
      expect(() => scrim.hide()).not.toThrow();
    });
  });

  describe("dispose", () => {
    it("removes the scrim div from the DOM", () => {
      const scrim = createScrimController();
      scrim.show();
      expect(getScrim()).not.toBeNull();

      scrim.dispose();
      expect(getScrim()).toBeNull();
    });

    it("is safe to call when no scrim is visible", () => {
      const scrim = createScrimController();
      expect(() => scrim.dispose()).not.toThrow();
    });

    it("is idempotent — calling twice does not throw", () => {
      const scrim = createScrimController();
      scrim.show();
      scrim.dispose();
      expect(() => scrim.dispose()).not.toThrow();
    });
  });

  describe("fail-open on CSP", () => {
    it("does not throw when document.body.appendChild throws", () => {
      const scrim = createScrimController();
      vi.spyOn(document.body, "appendChild").mockImplementation(() => {
        throw new Error("CSP violation");
      });
      expect(() => scrim.show()).not.toThrow();
    });

    it("does not inject a div when appendChild throws", () => {
      const scrim = createScrimController();
      vi.spyOn(document.body, "appendChild").mockImplementation(() => {
        throw new Error("CSP violation");
      });
      scrim.show();
      expect(getScrim()).toBeNull();
    });

    it("allows a subsequent show to succeed after a failed attempt", () => {
      const scrim = createScrimController();
      vi.spyOn(document.body, "appendChild").mockImplementationOnce(() => {
        throw new Error("CSP violation");
      });
      scrim.show();
      expect(getScrim()).toBeNull();

      // Retry after failure — must not be blocked by stale state
      scrim.show();
      expect(getScrim()).not.toBeNull();
    });
  });
});
