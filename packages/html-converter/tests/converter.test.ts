import { describe, expect, test } from "vitest";

import { convert } from "../src/converter.ts";
import { getDomParser } from "../src/dom.ts";
import { htmlStrategy } from "../src/strategies/html.ts";
import { markdownStrategy } from "../src/strategies/markdown.ts";

describe("convert", () => {
  test("converts HTML to Markdown (default clean: true)", async () => {
    const html =
      "<html><body>" +
      "<h1>Title</h1>" +
      "<p>This is a paragraph.</p>" +
      '<script>console.log("x")</script>' +
      "</body></html>";

    const result = await convert(html, { strategy: markdownStrategy });

    expect(result).toContain("# Title");
    expect(result).toContain("This is a paragraph.");
    expect(result).not.toContain("console.log");
  });

  test("skips cleaning when clean: false", async () => {
    const html = "<p>Content</p><script>alert(1)</script>";

    const result = await convert(html, {
      clean: false,
      strategy: markdownStrategy,
    });

    // Script content is preserved because cleaning is skipped
    expect(result).toContain("alert");
  });

  test("converts HTML to html format", async () => {
    const html =
      "<html><body>" +
      '<h1 class="title" id="h1">Hello</h1>' +
      '<p data-track="x">World</p>' +
      "</body></html>";

    const result = await convert(html, { strategy: htmlStrategy });

    expect(result).toContain("<h1");
    expect(result).toContain("Hello");
    expect(result).not.toContain('class="title"');
    expect(result).not.toContain('id="h1"');
    expect(result).not.toContain("data-track");
  });

  test("removes non-content elements during cleaning", async () => {
    const html =
      "<html><body>" +
      "<nav>Navigation</nav>" +
      "<article><p>Article content</p></article>" +
      "<footer>Footer</footer>" +
      "</body></html>";

    const result = await convert(html, { strategy: markdownStrategy });

    expect(result).not.toContain("Navigation");
    expect(result).not.toContain("Footer");
    expect(result).toContain("Article content");
  });

  test("handles complex HTML document end-to-end", async () => {
    const html =
      "<html><head><title>Page</title></head><body>" +
      "<article>" +
      "<h1>Getting Started</h1>" +
      "<p>Welcome to the guide.</p>" +
      "<ul><li>Install</li><li>Configure</li></ul>" +
      '<pre><code class="language-bash">npm install</code></pre>' +
      "<blockquote>Tip: read the docs</blockquote>" +
      "</article>" +
      '<nav><a href="/home">Home</a></nav>' +
      '<aside class="sidebar">Ads</aside>' +
      "</body></html>";

    const result = await convert(html, { strategy: markdownStrategy });

    expect(result).toContain("# Getting Started");
    expect(result).toContain("Welcome to the guide");
    expect(result).toContain("- Install");
    expect(result).toContain("- Configure");
    expect(result).toContain("```bash");
    expect(result).toContain("npm install");
    expect(result).toContain("> Tip: read the docs");
    expect(result).not.toContain("Home");
    expect(result).not.toContain("Ads");
  });

  test("handles empty HTML", async () => {
    const result = await convert("", { strategy: markdownStrategy });
    expect(result).toBe("");
  });

  test("handles HTML fragment without html/body wrapper", async () => {
    const html = "<h1>Fragment Title</h1><p>Fragment body.</p>";

    const result = await convert(html, { strategy: markdownStrategy });

    expect(result).toContain("# Fragment Title");
    expect(result).toContain("Fragment body.");
  });

  test("html strategy strips attributes from fragments", async () => {
    const html =
      '<h1 class="big" id="title">Heading</h1><p onclick="x()">Text</p>';

    const result = await convert(html, { strategy: htmlStrategy });

    expect(result).toContain("Heading");
    expect(result).not.toContain("class=");
    expect(result).not.toContain("id=");
    expect(result).not.toContain("onclick=");
  });

  test("returns a Promise", () => {
    const result = convert("<p>test</p>", { strategy: markdownStrategy });
    expect(result).toBeInstanceOf(Promise);
  });

  test("groups div inline content into single markdown paragraph", async () => {
    const html = "<div>Hello <strong>world</strong>!</div>";
    const result = await convert(html, { strategy: markdownStrategy });
    expect(result).toBe("Hello **world**!\n");
  });
});

describe("convert with getDomParser integration", () => {
  test("uses the DOM parser to process cleaned output", async () => {
    const parser = getDomParser();
    const html = '<p class="keep">Content here</p>';

    const _doc = parser.parse(html);
    const cleaned = await convert(html, {
      strategy: htmlStrategy,
    });

    expect(cleaned).toContain("Content here");
    expect(cleaned).not.toContain('class="keep"');
  });
});
