import { afterEach, describe, expect, it } from "vitest";
import {
  createHighlightController,
  type HighlightController,
} from "./highlight.ts";

function makeController(): HighlightController {
  return createHighlightController();
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("HighlightController", () => {
  describe("highlightElement", () => {
    it("adds the tamiz-highlight class to the element", () => {
      const controller = makeController();
      const element = document.createElement("div");

      controller.highlightElement(element);

      expect(element.classList.contains("tamiz-highlight")).toBe(true);
    });
  });

  describe("setHoverTarget", () => {
    it("adds the tamiz-hover class to the target element", () => {
      const controller = makeController();
      const element = document.createElement("div");

      controller.setHoverTarget(element);

      expect(element.classList.contains("tamiz-hover")).toBe(true);
    });

    it("removes hover from previous element when setting new target", () => {
      const controller = makeController();
      const el1 = document.createElement("div");
      const el2 = document.createElement("div");

      controller.setHoverTarget(el1);
      controller.setHoverTarget(el2);

      expect(el1.classList.contains("tamiz-hover")).toBe(false);
      expect(el2.classList.contains("tamiz-hover")).toBe(true);
    });

    it("removes hover class when target is null", () => {
      const controller = makeController();
      const element = document.createElement("div");

      controller.setHoverTarget(element);
      controller.setHoverTarget(null);

      expect(element.classList.contains("tamiz-hover")).toBe(false);
    });
  });

  describe("selectElement", () => {
    it("highlights the selected element", () => {
      const controller = makeController();
      const element = document.createElement("div");

      controller.selectElement(element);

      expect(element.classList.contains("tamiz-highlight")).toBe(true);
    });

    it("clears hover from the previously hovered element", () => {
      const controller = makeController();
      const hovered = document.createElement("div");
      const selected = document.createElement("div");

      controller.setHoverTarget(hovered);
      controller.selectElement(selected);

      expect(hovered.classList.contains("tamiz-hover")).toBe(false);
      expect(selected.classList.contains("tamiz-highlight")).toBe(true);
    });

    it("clears previous highlights before applying new one", () => {
      const controller = makeController();
      const el1 = document.createElement("div");
      const el2 = document.createElement("div");
      document.body.append(el1, el2);

      controller.highlightElement(el1);
      controller.selectElement(el2);

      expect(el1.classList.contains("tamiz-highlight")).toBe(false);
      expect(el2.classList.contains("tamiz-highlight")).toBe(true);
    });
  });

  describe("clearAll", () => {
    it("removes all highlight classes from the document", () => {
      const controller = makeController();
      const el1 = document.createElement("div");
      const el2 = document.createElement("p");
      document.body.append(el1, el2);

      controller.highlightElement(el1);
      controller.highlightElement(el2);
      controller.clearAll();

      expect(el1.classList.contains("tamiz-highlight")).toBe(false);
      expect(el2.classList.contains("tamiz-highlight")).toBe(false);
    });

    it("removes hover from the current hover target", () => {
      const controller = makeController();
      const element = document.createElement("div");

      controller.setHoverTarget(element);
      controller.clearAll();

      expect(element.classList.contains("tamiz-hover")).toBe(false);
    });

    it("is safe to call when no elements are highlighted", () => {
      const controller = makeController();
      expect(() => controller.clearAll()).not.toThrow();
    });
  });
});
