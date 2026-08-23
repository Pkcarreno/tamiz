import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

import { computeIndexPath, resolveIndexPath } from "./index-path.ts";

describe("computeIndexPath", () => {
  it("returns empty array when root equals target", () => {
    const { document } = parseHTML("<div><p>hello</p></div>");
    const root = document.querySelector("div") as Element;

    expect(computeIndexPath(root, root)).toEqual([]);
  });

  it("returns single index for direct child", () => {
    const { document } = parseHTML("<div><p>one</p><p>two</p></div>");
    const root = document.querySelector("div") as Element;
    const target = document.querySelectorAll("p")[1] as Element;

    expect(computeIndexPath(root, target)).toEqual([1]);
  });

  it("returns multi-step path for nested descendant", () => {
    const { document } = parseHTML(
      "<div><ul><li><span>x</span></li></ul></div>"
    );
    const root = document.querySelector("div") as Element;
    const target = document.querySelector("span") as Element;

    expect(computeIndexPath(root, target)).toEqual([0, 0, 0]);
  });

  it("returns null when target is not a descendant", () => {
    const { document } = parseHTML("<div><p>inside</p></div><p>outside</p>");
    const root = document.querySelector("div") as Element;
    const target = document.querySelectorAll("p")[1] as Element;

    expect(computeIndexPath(root, target)).toBeNull();
  });
});

describe("resolveIndexPath", () => {
  it("returns the root when path is empty", () => {
    const { document } = parseHTML("<div></div>");
    const root = document.querySelector("div") as Element;

    expect(resolveIndexPath(root, [])).toBe(root);
  });

  it("resolves a single-step path to the correct child", () => {
    const { document } = parseHTML("<div><p>zero</p><p>one</p></div>");
    const root = document.querySelector("div") as Element;

    const resolved = resolveIndexPath(root, [1]);

    expect(resolved?.textContent).toBe("one");
  });

  it("resolves a multi-step path", () => {
    const { document } = parseHTML(
      "<div><ul><li><span>deep</span></li></ul></div>"
    );
    const root = document.querySelector("div") as Element;

    const resolved = resolveIndexPath(root, [0, 0, 0]);

    expect(resolved?.textContent).toBe("deep");
  });

  it("returns null for out-of-bounds index", () => {
    const { document } = parseHTML("<div><p>only</p></div>");
    const root = document.querySelector("div") as Element;

    expect(resolveIndexPath(root, [5])).toBeNull();
  });
});
