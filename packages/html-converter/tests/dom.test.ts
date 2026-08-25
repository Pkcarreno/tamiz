import { parseHTML } from "linkedom";
import { describe, expect, test } from "vitest";

import {
  getContentNodes,
  getDomParser,
  NODE_TYPE,
  serialize,
} from "../src/dom.ts";

describe("NODE_TYPE constants", () => {
  test("exposes expected DOM node type codes", () => {
    expect(NODE_TYPE.ELEMENT).toBe(1);
    expect(NODE_TYPE.TEXT).toBe(3);
    expect(NODE_TYPE.COMMENT).toBe(8);
    expect(NODE_TYPE.DOCUMENT).toBe(9);
  });
});

describe("getDomParser", () => {
  test("returns a parser that can parse HTML fragments", () => {
    const parser = getDomParser();
    const doc = parser.parse("<p>Hello world</p>");
    expect(doc).toBeDefined();
  });

  test("returns a parser that can parse full HTML documents", () => {
    const parser = getDomParser();
    const doc = parser.parse("<html><body><p>Hello world</p></body></html>");
    const nodes = getContentNodes(doc);
    const p = nodes.find((n) => n.nodeType === NODE_TYPE.ELEMENT) as Element;
    expect(p.textContent).toContain("Hello world");
  });

  test("falls back to linkedom when DOMParser is unavailable", () => {
    const original = (globalThis as any).DOMParser;
    (globalThis as any).DOMParser = undefined;

    const parser = getDomParser();
    const doc = parser.parse("<p>linkedom path</p>");
    const html = doc.toString();

    expect(html).toContain("linkedom path");

    (globalThis as any).DOMParser = original;
  });

  test("uses native DOMParser when available", () => {
    const original = (globalThis as any).DOMParser;
    let called = false;

    (globalThis as any).DOMParser = class MockDOMParser {
      parseFromString(html: string, _type: string) {
        called = true;
        return parseHTML(html).document;
      }
    };

    const parser = getDomParser();
    const doc = parser.parse("<p>native path</p>");

    expect(called).toBe(true);
    expect(doc.toString()).toContain("native path");

    (globalThis as any).DOMParser = original;
  });
});

describe("serialize", () => {
  test("serializes an element to an HTML string", () => {
    const { document } = parseHTML("<p>Hello <strong>world</strong></p>");
    const p = document.querySelector("p") as Element;
    const html = serialize(p);
    expect(html).toContain("<p>");
    expect(html).toContain("Hello");
    expect(html).toContain("<strong>");
  });

  test("serializes a document to an HTML string", () => {
    const { document } = parseHTML("<html><body><p>Full</p></body></html>");
    const html = serialize(document);
    expect(html).toContain("<html>");
    expect(html).toContain("Full");
  });
});

describe("getContentNodes", () => {
  test("returns body children for full documents", () => {
    const { document } = parseHTML(
      "<html><body><p>A</p><span>B</span></body></html>"
    );
    const nodes = getContentNodes(document);
    expect(nodes.some((n) => n.textContent?.includes("A"))).toBe(true);
    expect(nodes.some((n) => n.textContent?.includes("B"))).toBe(true);
  });

  test("returns document-level children for fragments", () => {
    const { document } = parseHTML("<p>Fragment</p>");
    const nodes = getContentNodes(document);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0].textContent).toContain("Fragment");
  });

  test("returns element children for Elements", () => {
    const { document } = parseHTML("<div><p>one</p><p>two</p></div>");
    const div = document.querySelector("div") as Element;
    const nodes = getContentNodes(div);
    expect(nodes.length).toBe(2);
  });
});
