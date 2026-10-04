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

  test("converts using format option name without explicit strategy", async () => {
    const html = "<h1>Heading</h1><p>Paragraph</p>";
    const mdResult = await convert(html, { format: "markdown" });
    expect(mdResult).toContain("# Heading");

    const htmlResult = await convert(html, { format: "html" });
    expect(htmlResult).toContain("<h1>");
    expect(htmlResult).toContain("Heading");
  });

  test("defaults to markdown format when options are omitted", async () => {
    const html = "<h2>Default Heading</h2>";
    const result = await convert(html);
    expect(result).toBe("## Default Heading\n");
  });

  test("converts DOM Element directly without string serialization", async () => {
    const parser = getDomParser();
    const doc = parser.parse(
      '<div id="container"><article><h1>Article</h1><p>Body text</p><script>bad()</script></article></div>'
    );
    const element = doc.querySelector("article") as Element;

    const result = await convert(element, { format: "markdown" });

    expect(result).toContain("# Article");
    expect(result).toContain("Body text");
    expect(result).not.toContain("bad()");
  });

  test("does not mutate the source Element when converting", async () => {
    const parser = getDomParser();
    const doc = parser.parse(
      '<div class="keep-class"><script>console.log(1)</script><p>Text</p></div>'
    );
    const element = doc.querySelector("div") as Element;

    await convert(element, { format: "markdown" });

    // Original element retains its class and script children
    expect(element.getAttribute("class")).toBe("keep-class");
    expect(element.querySelector("script")).not.toBeNull();
  });

  test("skips cleaning for Element input when clean: false", async () => {
    const parser = getDomParser();
    const doc = parser.parse(
      '<div><script>alert("preserve-me")</script><p>Text</p></div>'
    );
    const element = doc.querySelector("div") as Element;

    const result = await convert(element, {
      clean: false,
      format: "markdown",
    });

    expect(result).toContain("preserve-me");
  });

  test("excludes specified elements without mutating the source tree", async () => {
    const parser = getDomParser();
    const doc = parser.parse(
      '<section><p>First</p><p id="remove-me">Second</p><p>Third</p></section>'
    );
    const root = doc.querySelector("section") as Element;
    const toExclude = doc.querySelector("#remove-me") as Element;

    const result = await convert(root, {
      exclude: new Set([toExclude]),
      format: "markdown",
    });

    expect(result).toContain("First");
    expect(result).toContain("Third");
    expect(result).not.toContain("Second");

    // Source tree in caller DOM is completely untouched
    expect(root.children.length).toBe(3);
    expect(root.querySelector("#remove-me")).not.toBeNull();
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
