import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";

import {
  cleanHtml,
  SEMANTIC_ATTRIBUTES,
  stripNonSemanticAttributes,
} from "../src/cleaner.ts";

describe("cleanHtml", () => {
  test("removes script tags and their content", () => {
    const html = '<p>Keep me</p><script>alert("evil")</script>';
    const result = cleanHtml(html);
    const doc = parseHTML(result).document;
    expect(doc.querySelector("script")).toBeNull();
    expect(result).toContain("Keep me");
  });

  test("removes style tags and their content", () => {
    const html = "<p>Content</p><style>.hidden { display: none }</style>";
    const result = cleanHtml(html);
    expect(result).not.toContain(".hidden");
    expect(result).toContain("Content");
  });

  test("removes nav, footer, aside, header elements", () => {
    const html =
      "<nav>Nav links</nav><p>Main content</p><footer>Footer text</footer><aside>Sidebar</aside><header>Header</header>";
    const result = cleanHtml(html);
    expect(result).not.toContain("Nav links");
    expect(result).not.toContain("Footer text");
    expect(result).not.toContain("Sidebar");
    expect(result).not.toContain("Header");
    expect(result).toContain("Main content");
  });

  test("removes elements with ad-related classes or IDs", () => {
    const html =
      '<div class="advertisement">Ad content</div>' +
      '<div id="sidebar">Sidebar content</div>' +
      '<div class="banner-ad">Promo</div>' +
      "<p>Real content</p>";
    const result = cleanHtml(html);
    expect(result).not.toContain("Ad content");
    expect(result).not.toContain("Sidebar content");
    expect(result).not.toContain("Promo");
    expect(result).toContain("Real content");
  });

  test("preserves elements with class containing 'ad' as substring (word boundary)", () => {
    // "heading-style-h4" contains "ad" but should NOT be removed
    const html =
      '<div class="heading-style-h4">Qualifications</div>' +
      '<div class="text-size-regular">Content here</div>';
    const result = cleanHtml(html);
    expect(result).toContain("Qualifications");
    expect(result).toContain("Content here");
  });

  test("strips non-semantic attributes (class, id, data-*, onclick)", () => {
    const html =
      '<p class="text-large" id="para1" data-track="true" onclick="evil()" title="hello" href="https://example.com">Text</p>';
    const result = cleanHtml(html);
    const doc = parseHTML(result).document;
    const p = doc.querySelector("p") as Element;
    expect(p).toBeDefined();
    expect(p.hasAttribute("class")).toBe(false);
    expect(p.hasAttribute("id")).toBe(false);
    expect(p.hasAttribute("data-track")).toBe(false);
    expect(p.hasAttribute("onclick")).toBe(false);
    expect(p.getAttribute("title")).toBe("hello");
    expect(p.getAttribute("href")).toBe("https://example.com");
  });

  test("keeps semantic attributes on links and images", () => {
    const html =
      '<a class="link" href="https://example.com" onclick="track()">Link text</a>' +
      '<img class="img" src="photo.jpg" alt="A photo" data-x="1">';
    const result = cleanHtml(html);
    const doc = parseHTML(result).document;

    const a = doc.querySelector("a") as Element;
    expect(a.getAttribute("href")).toBe("https://example.com");
    expect(a.hasAttribute("onclick")).toBe(false);
    expect(a.hasAttribute("class")).toBe(false);

    const img = doc.querySelector("img") as Element;
    expect(img.getAttribute("src")).toBe("photo.jpg");
    expect(img.getAttribute("alt")).toBe("A photo");
    expect(img.hasAttribute("data-x")).toBe(false);
  });

  test('strips event handler attributes starting with "on"', () => {
    const html = '<p onload="doStuff()" onmouseover="track()">Content</p>';
    const result = cleanHtml(html);
    const doc = parseHTML(result).document;
    const p = doc.querySelector("p") as Element;
    expect(p.hasAttribute("onload")).toBe(false);
    expect(p.hasAttribute("onmouseover")).toBe(false);
  });

  test("filters out low content-density elements", () => {
    const html =
      '<div><a href="x">Link 1</a> <a href="y">Link 2</a> <a href="z">Link 3</a></div>' +
      "<p>This is a real paragraph with substantial content that should be kept.</p>";
    const result = cleanHtml(html);
    expect(result).toContain("real paragraph");
  });

  test("preserves nested content structure", () => {
    const html =
      "<article><h1>Title</h1><p>Paragraph one.</p><p>Paragraph two.</p></article>";
    const result = cleanHtml(html);
    expect(result).toContain("Title");
    expect(result).toContain("Paragraph one");
    expect(result).toContain("Paragraph two");
  });

  test("handles empty HTML input", () => {
    const result = cleanHtml("");
    expect(result).toBeDefined();
  });

  test("handles HTML with only scripts", () => {
    const result = cleanHtml('<script>console.log("nope")</script>');
    expect(result).toBeDefined();
  });
});

describe("stripNonSemanticAttributes", () => {
  test("removes class, id, data-* and event handler attributes", () => {
    const { document } = parseHTML(
      '<p class="foo" id="bar" data-x="1" onclick="x()" style="color:red" title="ok" href="url">Text</p>'
    );
    const p = document.querySelector("p") as Element;

    stripNonSemanticAttributes(p);

    expect(p.hasAttribute("class")).toBe(false);
    expect(p.hasAttribute("id")).toBe(false);
    expect(p.hasAttribute("data-x")).toBe(false);
    expect(p.hasAttribute("onclick")).toBe(false);
    expect(p.hasAttribute("style")).toBe(false);
    expect(p.getAttribute("title")).toBe("ok");
    expect(p.getAttribute("href")).toBe("url");
  });

  test("strips attributes from all descendant elements", () => {
    const { document } = parseHTML(
      '<div class="container"><a class="link" href="ok">text</a></div>'
    );
    const div = document.querySelector("div") as Element;

    stripNonSemanticAttributes(div);

    expect(div.hasAttribute("class")).toBe(false);
    const a = div.querySelector("a") as Element;
    expect(a.hasAttribute("class")).toBe(false);
    expect(a.getAttribute("href")).toBe("ok");
  });
});

describe("SEMANTIC_ATTRIBUTES", () => {
  test("includes the required attributes", () => {
    expect(SEMANTIC_ATTRIBUTES.has("href")).toBe(true);
    expect(SEMANTIC_ATTRIBUTES.has("src")).toBe(true);
    expect(SEMANTIC_ATTRIBUTES.has("alt")).toBe(true);
    expect(SEMANTIC_ATTRIBUTES.has("title")).toBe(true);
    expect(SEMANTIC_ATTRIBUTES.has("colspan")).toBe(true);
    expect(SEMANTIC_ATTRIBUTES.has("rowspan")).toBe(true);
  });

  test("excludes non-semantic attributes", () => {
    expect(SEMANTIC_ATTRIBUTES.has("class")).toBe(false);
    expect(SEMANTIC_ATTRIBUTES.has("id")).toBe(false);
    expect(SEMANTIC_ATTRIBUTES.has("style")).toBe(false);
    expect(SEMANTIC_ATTRIBUTES.has("onclick")).toBe(false);
  });
});
