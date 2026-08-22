import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

import {
  buildFilename,
  extractArticleName,
  extractFirstHeading,
  extractTwitterTitle,
  slugify,
  truncateSlug,
} from "./build-filename.ts";

describe("extractFirstHeading", () => {
  it("extracts the first h1 heading", () => {
    const { document } = parseHTML("<div><h1>My Article</h1></div>");
    const element = document.querySelector("div") as Element;

    expect(extractFirstHeading(element)).toBe("My Article");
  });

  it("extracts h2 when no h1 exists", () => {
    const { document } = parseHTML("<div><h2>Subtitle</h2></div>");
    const element = document.querySelector("div") as Element;

    expect(extractFirstHeading(element)).toBe("Subtitle");
  });

  it("returns first heading in document order", () => {
    const { document } = parseHTML("<div><h2>First</h2><h1>Second</h1></div>");
    const element = document.querySelector("div") as Element;

    expect(extractFirstHeading(element)).toBe("First");
  });

  it("trims whitespace from heading text", () => {
    const { document } = parseHTML("<div><h1>  Spaced  </h1></div>");
    const element = document.querySelector("div") as Element;

    expect(extractFirstHeading(element)).toBe("Spaced");
  });

  it("returns null for empty heading", () => {
    const { document } = parseHTML("<div><h1></h1></div>");
    const element = document.querySelector("div") as Element;

    expect(extractFirstHeading(element)).toBeNull();
  });

  it("returns null when no headings exist", () => {
    const { document } = parseHTML("<div><p>No headings</p></div>");
    const element = document.querySelector("div") as Element;

    expect(extractFirstHeading(element)).toBeNull();
  });
});

describe("extractArticleName", () => {
  it("extracts og:article:title", () => {
    const { document } = parseHTML(
      '<html><head><meta property="og:article:title" content="OG Title"></head></html>'
    );

    expect(extractArticleName(document)).toBe("OG Title");
  });

  it("falls back to meta[name=title]", () => {
    const { document } = parseHTML(
      '<html><head><meta name="title" content="Meta Title"></head></html>'
    );

    expect(extractArticleName(document)).toBe("Meta Title");
  });

  it("prefers og:article:title over meta[name=title]", () => {
    const { document } = parseHTML(
      '<html><head><meta property="og:article:title" content="OG"><meta name="title" content="Meta"></head></html>'
    );

    expect(extractArticleName(document)).toBe("OG");
  });

  it("returns null when no meta tags exist", () => {
    const { document } = parseHTML("<html><head></head></html>");

    expect(extractArticleName(document)).toBeNull();
  });

  it("returns null when content is empty", () => {
    const { document } = parseHTML(
      '<html><head><meta property="og:article:title" content=""></head></html>'
    );

    expect(extractArticleName(document)).toBeNull();
  });

  it("trims whitespace from content", () => {
    const { document } = parseHTML(
      '<html><head><meta property="og:article:title" content="  Trimmed  "></head></html>'
    );

    expect(extractArticleName(document)).toBe("Trimmed");
  });
});

describe("extractTwitterTitle", () => {
  it("extracts twitter:title", () => {
    const { document } = parseHTML(
      '<html><head><meta name="twitter:title" content="Twitter Title"></head></html>'
    );

    expect(extractTwitterTitle(document)).toBe("Twitter Title");
  });

  it("returns null when no twitter:title exists", () => {
    const { document } = parseHTML("<html><head></head></html>");

    expect(extractTwitterTitle(document)).toBeNull();
  });

  it("returns null when content is empty", () => {
    const { document } = parseHTML(
      '<html><head><meta name="twitter:title" content=""></head></html>'
    );

    expect(extractTwitterTitle(document)).toBeNull();
  });

  it("trims whitespace from content", () => {
    const { document } = parseHTML(
      '<html><head><meta name="twitter:title" content="  Twitter Trimmed  "></head></html>'
    );

    expect(extractTwitterTitle(document)).toBe("Twitter Trimmed");
  });
});

describe("slugify", () => {
  it("converts text to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("my article title")).toBe("my-article-title");
  });

  it("removes diacritics", () => {
    expect(slugify("café résumé")).toBe("cafe-resume");
  });

  it("removes special characters", () => {
    expect(slugify("hello! @world#")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("removes leading and trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

const TRAILING_HYPHEN = /-$/;

describe("truncateSlug", () => {
  it("returns slug unchanged when within limit", () => {
    expect(truncateSlug("short-slug", "md")).toBe("short-slug");
  });

  it("truncates slug when exceeding limit", () => {
    const longSlug = "a".repeat(120);
    const result = truncateSlug(longSlug, "md");
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).not.toMatch(TRAILING_HYPHEN);
  });

  it("returns untitled when maxTotalLength is too small", () => {
    const result = truncateSlug("any-slug", "md", 2);
    expect(result).toBe("untitled");
  });

  it("removes trailing hyphens after truncation", () => {
    const slug = "word-word-word-word";
    const result = truncateSlug(slug, "md", 10);
    expect(result).not.toMatch(TRAILING_HYPHEN);
  });
});

describe("buildFilename", () => {
  it("prefers heading over other sources", () => {
    const { document } = parseHTML("<div><h1>My Heading</h1></div>");
    const element = document.querySelector("div") as Element;
    const source = {
      articleName: "Article Name",
      element,
      pageTitle: "Page Title",
      twitterTitle: "Twitter Title",
    };

    expect(buildFilename(source, "md")).toBe("my-heading.md");
  });

  it("falls back to article name when no heading", () => {
    const { document } = parseHTML("<div><p>No heading</p></div>");
    const element = document.querySelector("div") as Element;
    const source = {
      articleName: "Article Name",
      element,
      pageTitle: "Page Title",
    };

    expect(buildFilename(source, "md")).toBe("article-name.md");
  });

  it("falls back to twitter title when no heading or article name", () => {
    const { document } = parseHTML("<div><p>No heading</p></div>");
    const element = document.querySelector("div") as Element;
    const source = {
      element,
      pageTitle: "Page Title",
      twitterTitle: "Twitter Title",
    };

    expect(buildFilename(source, "md")).toBe("twitter-title.md");
  });

  it("falls back to page title when no heading, article name, or twitter title", () => {
    const { document } = parseHTML("<div><p>No heading</p></div>");
    const element = document.querySelector("div") as Element;
    const source = {
      element,
      pageTitle: "Page Title",
    };

    expect(buildFilename(source, "md")).toBe("page-title.md");
  });

  it("returns untitled fallback when all sources are empty", () => {
    const { document } = parseHTML("<div><p>No heading</p></div>");
    const element = document.querySelector("div") as Element;
    const source = {
      element,
      pageTitle: "",
    };

    expect(buildFilename(source, "md")).toBe("tamiz-untitled.md");
  });

  it("uses the provided extension", () => {
    const { document } = parseHTML("<div><h1>Test</h1></div>");
    const element = document.querySelector("div") as Element;
    const source = { element, pageTitle: "" };

    expect(buildFilename(source, "html")).toBe("test.html");
  });
});
