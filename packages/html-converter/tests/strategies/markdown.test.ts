import { describe, expect, test } from "bun:test";
import { parseHTML } from "linkedom";
import { getDomParser } from "../../src/dom.ts";
import { markdownStrategy } from "../../src/strategies/markdown.ts";

describe("markdownStrategy — headings", () => {
  test("converts h1 to #", () => {
    const doc = parseHTML("<h1>Title</h1>").document;
    expect(markdownStrategy.convert(doc)).toBe("# Title\n");
  });

  test("converts h2 to ##", () => {
    const doc = parseHTML("<h2>Section</h2>").document;
    expect(markdownStrategy.convert(doc)).toBe("## Section\n");
  });

  test("converts h3 to ###", () => {
    const doc = parseHTML("<h3>Subsection</h3>").document;
    expect(markdownStrategy.convert(doc)).toBe("### Subsection\n");
  });

  test("converts h4 to ####", () => {
    const doc = parseHTML("<h4>Sub-subsection</h4>").document;
    expect(markdownStrategy.convert(doc)).toBe("#### Sub-subsection\n");
  });

  test("converts h5 to #####", () => {
    const doc = parseHTML("<h5>Level 5</h5>").document;
    expect(markdownStrategy.convert(doc)).toBe("##### Level 5\n");
  });

  test("converts h6 to ######", () => {
    const doc = parseHTML("<h6>Level 6</h6>").document;
    expect(markdownStrategy.convert(doc)).toBe("###### Level 6\n");
  });
});

describe("markdownStrategy — paragraphs", () => {
  test("converts paragraphs", () => {
    const doc = parseHTML("<p>Hello world</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("Hello world\n");
  });

  test("handles multiple paragraphs", () => {
    const doc = parseHTML("<p>First.</p><p>Second.</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("First.\n\nSecond.\n");
  });
});

describe("markdownStrategy — inline formatting", () => {
  test("converts bold (<strong>)", () => {
    const doc = parseHTML("<p><strong>Bold</strong> text</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("**Bold** text\n");
  });

  test("converts bold (<b>)", () => {
    const doc = parseHTML("<p><b>Bold</b> text</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("**Bold** text\n");
  });

  test("converts italic (<em>)", () => {
    const doc = parseHTML("<p><em>Italic</em> text</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("*Italic* text\n");
  });

  test("converts italic (<i>)", () => {
    const doc = parseHTML("<p><i>Italic</i> text</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("*Italic* text\n");
  });

  test("combines bold and italic", () => {
    const doc = parseHTML(
      "<p><strong>Bold</strong> and <em>italic</em></p>"
    ).document;
    expect(markdownStrategy.convert(doc)).toBe("**Bold** and *italic*\n");
  });

  test("escapes markdown special characters in text", () => {
    const doc = parseHTML("<p>A #1 * B</p>").document;
    // # and * should be escaped
    const result = markdownStrategy.convert(doc);
    expect(result).toContain("\\#");
    expect(result).toContain("B");
  });
});

describe("markdownStrategy — links and images", () => {
  test("converts anchor tags", () => {
    const doc = parseHTML(
      '<p><a href="https://example.com">Link text</a></p>'
    ).document;
    expect(markdownStrategy.convert(doc)).toBe(
      "[Link text](https://example.com)\n"
    );
  });

  test("converts anchor without href", () => {
    const doc = parseHTML("<a>Plain link</a>").document;
    expect(markdownStrategy.convert(doc)).toBe("Plain link\n");
  });

  test("converts images", () => {
    const doc = parseHTML('<img src="photo.jpg" alt="A photo">').document;
    expect(markdownStrategy.convert(doc)).toBe("![A photo](photo.jpg)\n");
  });

  test("handles images without alt text", () => {
    const doc = parseHTML('<img src="pic.png">').document;
    expect(markdownStrategy.convert(doc)).toBe("![](pic.png)\n");
  });
});

describe("markdownStrategy — lists", () => {
  test("converts unordered lists", () => {
    const doc = parseHTML("<ul><li>Apple</li><li>Banana</li></ul>").document;
    expect(markdownStrategy.convert(doc)).toBe("- Apple\n- Banana\n");
  });

  test("converts ordered lists", () => {
    const doc = parseHTML("<ol><li>First</li><li>Second</li></ol>").document;
    expect(markdownStrategy.convert(doc)).toBe("1. First\n2. Second\n");
  });

  test("handles nested unordered lists", () => {
    const doc = parseHTML(
      "<ul><li>Item 1</li><li>Item 2<ul><li>Nested</li></ul></li></ul>"
    ).document;
    expect(markdownStrategy.convert(doc)).toBe(
      "- Item 1\n- Item 2\n  - Nested\n"
    );
  });

  test("handles nested ordered lists", () => {
    const doc = parseHTML(
      "<ol><li>First</li><li>Second<ol><li>Nested</li></ol></li></ol>"
    ).document;
    expect(markdownStrategy.convert(doc)).toBe(
      "1. First\n2. Second\n  1. Nested\n"
    );
  });

  test("handles lists with mixed content", () => {
    const doc = parseHTML(
      "<ul><li><strong>Bold item</strong></li><li>Plain item</li></ul>"
    ).document;
    expect(markdownStrategy.convert(doc)).toBe(
      "- **Bold item**\n- Plain item\n"
    );
  });
});

describe("markdownStrategy — code blocks", () => {
  test("converts pre/code blocks", () => {
    const doc = parseHTML('<pre><code>console.log("hi")</code></pre>').document;
    expect(markdownStrategy.convert(doc)).toBe('```\nconsole.log("hi")\n```\n');
  });

  test("extracts language from code class", () => {
    const doc = parseHTML(
      '<pre><code class="language-javascript">const x = 1;</code></pre>'
    ).document;
    expect(markdownStrategy.convert(doc)).toBe(
      "```javascript\nconst x = 1;\n```\n"
    );
  });

  test("converts inline code", () => {
    const doc = parseHTML("<p>Use <code>git</code> command</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("Use `git` command\n");
  });
});

describe("markdownStrategy — blockquotes", () => {
  test("converts blockquotes", () => {
    const doc = parseHTML("<blockquote>A wise quote</blockquote>").document;
    expect(markdownStrategy.convert(doc)).toBe("> A wise quote\n");
  });

  test("handles inline formatting in blockquotes", () => {
    const doc = parseHTML(
      "<blockquote><strong>Note:</strong> important</blockquote>"
    ).document;
    expect(markdownStrategy.convert(doc)).toBe("> **Note:** important\n");
  });
});

describe("markdownStrategy — horizontal rule", () => {
  test("converts hr tags", () => {
    const doc = parseHTML("<p>Before</p><hr><p>After</p>").document;
    expect(markdownStrategy.convert(doc)).toBe("Before\n\n---\n\nAfter\n");
  });
});

describe("markdownStrategy — tables", () => {
  test("converts simple tables", () => {
    const doc = parseHTML(
      "<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>"
    ).document;
    expect(markdownStrategy.convert(doc)).toBe(
      "| Name | Value |\n| --- | --- |\n| A | 1 |\n"
    );
  });

  test("escapes pipes in cell content", () => {
    const doc = parseHTML(
      "<table><tr><th>Col</th></tr><tr><td>A | B</td></tr></table>"
    ).document;
    expect(markdownStrategy.convert(doc)).toBe(
      "| Col |\n| --- |\n| A \\| B |\n"
    );
  });
});

describe("markdownStrategy — mixed content", () => {
  test("handles complex mixed content", () => {
    const html =
      "<h1>README</h1>" +
      "<p>This is <strong>important</strong> text with a " +
      '<a href="https://x.com">link</a>.</p>' +
      "<ul><li>Point one</li><li><code>inline</code> code</li></ul>" +
      "<pre><code>const x = 1;</code></pre>" +
      "<blockquote>Quote here</blockquote>";

    const doc = parseHTML(html).document;
    const result = markdownStrategy.convert(doc);

    expect(result).toContain("# README");
    expect(result).toContain("**important**");
    expect(result).toContain("[link](https://x.com)");
    expect(result).toContain("- Point one");
    expect(result).toContain("- `inline` code");
    expect(result).toContain("```\nconst x = 1;\n```");
    expect(result).toContain("> Quote here");
  });

  test("handles empty input", () => {
    const doc = parseHTML("").document;
    expect(markdownStrategy.convert(doc)).toBe("");
  });

  test("works with getDomParser output", () => {
    const parser = getDomParser();
    const doc = parser.parse("<p>Hello <strong>there</strong></p>");
    expect(markdownStrategy.convert(doc)).toBe("Hello **there**\n");
  });
});
