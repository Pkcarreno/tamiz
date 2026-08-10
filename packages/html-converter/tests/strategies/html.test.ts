import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import { getDomParser } from "../../src/dom.ts";
import { htmlStrategy } from "../../src/strategies/html.ts";

describe("htmlStrategy", () => {
  test("returns HTML with only semantic attributes", () => {
    const html =
      '<p class="foo" id="bar" data-x="1" onclick="evil()" title="ok" href="url" src="img.png">Text</p>';
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    expect(result).not.toContain("class=");
    expect(result).not.toContain("id=");
    expect(result).not.toContain("data-x=");
    expect(result).not.toContain("onclick=");
    expect(result).toContain('title="ok"');
    expect(result).toContain('href="url"');
    expect(result).toContain('src="img.png"');
  });

  test("pretty-prints with two-space indent", () => {
    const html = "<div><p>Hello</p></div>";
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    expect(result).toContain("<div>");
    expect(result).toContain("  <p>");
    expect(result).not.toContain("    <p>");
  });

  test("preserves text content within elements", () => {
    const html = "<p>Hello world</p>";
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    expect(result).toContain("Hello world");
  });

  test("handles multiple top-level elements", () => {
    const html = "<h1>Title</h1><p>Body</p>";
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    expect(result).toContain("<h1>");
    expect(result).toContain("Title");
    expect(result).toContain("<p>");
    expect(result).toContain("Body");
  });

  test("formats void elements as self-closing", () => {
    const html = '<div><img src="pic.jpg" alt="pic"><br><hr></div>';
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    expect(result).toContain('<img src="pic.jpg" alt="pic" />');
    expect(result).toContain("<br />");
    expect(result).toContain("<hr />");
  });

  test("strips attributes even on nested elements", () => {
    const html =
      '<div class="outer"><span class="inner" title="ok">Text</span></div>';
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    expect(result).not.toContain('class="outer"');
    expect(result).not.toContain('class="inner"');
    expect(result).toContain('title="ok"');
  });

  test("handles empty document", () => {
    const doc = parseHTML("").document;
    const result = htmlStrategy.convert(doc);
    expect(result).toBe("");
  });

  test("preserves table cell attributes", () => {
    const html =
      '<table><tr><th colspan="2" class="head">Header</th></tr></table>';
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    expect(result).toContain('colspan="2"');
    expect(result).not.toContain("class=");
  });

  test("works with getDomParser output", () => {
    const parser = getDomParser();
    const doc = parser.parse(
      '<html><body><p class="x">Content</p></body></html>'
    );

    const result = htmlStrategy.convert(doc);

    expect(result).toContain("Content");
    expect(result).not.toContain('class="x"');
  });

  test("preserves interleaved text and elements in document order", () => {
    const html = "<div>Hello <span>world</span></div>";
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    // Text "Hello " must survive before <span> — current code drops it
    expect(result).toContain("Hello");
    expect(result).toContain("<span>");
    expect(result).toContain("world");
  });

  test("strips zero-width joiner from text nodes", () => {
    const html = "<li>\u200D<strong>Nice to have</strong>: Experience.</li>";
    const doc = parseHTML(html).document;

    const result = htmlStrategy.convert(doc);

    // Zero-width joiner should not appear in output
    expect(result).not.toContain("\u200D");
    expect(result).toContain("Nice to have");
    expect(result).toContain(": Experience.");
  });
});
