import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

import { extractContent } from "./extract-content.ts";

describe("extractContent", () => {
  it("returns the HTML of a clean element", () => {
    const { document } = parseHTML("<div><p>Hello <b>world</b></p></div>");
    const element = document.querySelector("div") as Element;

    expect(extractContent(element)).toBe(
      "<div><p>Hello <b>world</b></p></div>"
    );
  });

  it("strips a tamiz bar host from the cloned output", () => {
    const { document } = parseHTML(
      '<div><p>before<span data-tamiz-bar="x">bar</span>after</p></div>'
    );
    const element = document.querySelector("div") as Element;

    const result = extractContent(element);

    expect(result).not.toContain("data-tamiz-bar");
    expect(result).toContain("before");
    expect(result).toContain("after");
  });

  it("strips all nested tamiz bar hosts", () => {
    const { document } = parseHTML(
      "<div><p><span data-tamiz-bar><b data-tamiz-bar>bar</b></span></p></div>"
    );
    const element = document.querySelector("div") as Element;

    const result = extractContent(element);

    expect(result).not.toContain("data-tamiz-bar");
  });

  it("does not mutate the source element", () => {
    const { document } = parseHTML(
      "<div><p><span data-tamiz-bar>x</span></p></div>"
    );
    const element = document.querySelector("div") as Element;

    extractContent(element);

    // The original keeps its bar host; only the clone was stripped.
    expect(element.querySelectorAll("[data-tamiz-bar]").length).toBe(1);
  });

  it("returns the HTML of an empty element", () => {
    const { document } = parseHTML("<p></p>");
    const element = document.querySelector("p") as Element;

    expect(extractContent(element)).toBe("<p></p>");
  });
});

describe("extractContent — exclusion", () => {
  it("excludes marked elements from the cloned output", () => {
    const { document } = parseHTML(
      "<div><p>keep</p><p>exclude me</p><p>keep too</p></div>"
    );
    const element = document.querySelector("div") as Element;
    const paragraphs = document.querySelectorAll("p");
    const excluded = new Set<Element>([paragraphs[1]]);

    const result = extractContent(element, excluded);

    expect(result).toContain("keep");
    expect(result).toContain("keep too");
    expect(result).not.toContain("exclude me");
  });

  it("does not mutate the source element when excluding", () => {
    const { document } = parseHTML("<div><p>keep</p><p>exclude</p></div>");
    const element = document.querySelector("div") as Element;
    const paragraphs = document.querySelectorAll("p");
    const excluded = new Set<Element>([paragraphs[1]]);

    extractContent(element, excluded);

    // Source element keeps both children.
    expect(element.children.length).toBe(2);
  });

  it("handles an empty excluded set", () => {
    const { document } = parseHTML("<div><p>content</p></div>");
    const element = document.querySelector("div") as Element;
    const excluded = new Set<Element>();

    const result = extractContent(element, excluded);

    expect(result).toContain("content");
  });

  it("returns full content when excludedElements is not provided", () => {
    const { document } = parseHTML("<div><p>content</p></div>");
    const element = document.querySelector("div") as Element;

    const result = extractContent(element);

    expect(result).toContain("content");
  });
});
