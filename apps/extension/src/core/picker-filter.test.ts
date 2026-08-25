import { describe, expect, it } from "vitest";
import {
  isSelectable,
  OMITTED_ATTRIBUTES,
  OMITTED_TAGS,
} from "./picker-filter.ts";

// ---------------------------------------------------------------------------
// OMITTED_TAGS
// ---------------------------------------------------------------------------

describe("OMITTED_TAGS", () => {
  it("contains html, body, and head", () => {
    expect(OMITTED_TAGS.has("html")).toBe(true);
    expect(OMITTED_TAGS.has("body")).toBe(true);
    expect(OMITTED_TAGS.has("head")).toBe(true);
  });

  it("does not contain div or other common tags", () => {
    expect(OMITTED_TAGS.has("div")).toBe(false);
    expect(OMITTED_TAGS.has("p")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OMITTED_ATTRIBUTES
// ---------------------------------------------------------------------------

describe("OMITTED_ATTRIBUTES", () => {
  it("contains data-tamiz-ui", () => {
    expect(OMITTED_ATTRIBUTES.has("data-tamiz-ui")).toBe(true);
  });

  it("does not contain unrelated attributes", () => {
    expect(OMITTED_ATTRIBUTES.has("class")).toBe(false);
    expect(OMITTED_ATTRIBUTES.has("id")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSelectable — tag-based filtering
// ---------------------------------------------------------------------------

describe("isSelectable", () => {
  describe("omitted tags", () => {
    it("returns false for <html>", () => {
      const el = document.createElement("html");
      expect(isSelectable(el)).toBe(false);
    });

    it("returns false for <body>", () => {
      const el = document.createElement("body");
      expect(isSelectable(el)).toBe(false);
    });

    it("returns false for <head>", () => {
      const el = document.createElement("head");
      expect(isSelectable(el)).toBe(false);
    });

    it("returns false for tag names regardless of case", () => {
      const el = document.createElement("HTML");
      expect(isSelectable(el)).toBe(false);
    });
  });

  describe("omitted attributes", () => {
    it("returns false for element with data-tamiz-ui attribute", () => {
      const el = document.createElement("div");
      el.setAttribute("data-tamiz-ui", "");
      expect(isSelectable(el)).toBe(false);
    });

    it("returns false for element with non-empty data-tamiz-ui", () => {
      const el = document.createElement("span");
      el.setAttribute("data-tamiz-ui", "true");
      expect(isSelectable(el)).toBe(false);
    });
  });

  describe("normal elements", () => {
    it("returns true for <div>", () => {
      expect(isSelectable(document.createElement("div"))).toBe(true);
    });

    it("returns true for <p>", () => {
      expect(isSelectable(document.createElement("p"))).toBe(true);
    });

    it("returns true for <a>", () => {
      expect(isSelectable(document.createElement("a"))).toBe(true);
    });

    it("returns true for <section>", () => {
      expect(isSelectable(document.createElement("section"))).toBe(true);
    });
  });
});
