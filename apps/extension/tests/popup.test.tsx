import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "../src/entrypoints/popup/main.tsx";

describe("popup header branding", () => {
  afterEach(() => cleanup());

  it("renders the 18px logo mark as inline SVG before the Tamiz wordmark in DOM order", () => {
    const { container } = render(() => <App />);

    // The popup must NOT use <img src="/icons/32.png"> — that approach is removed.
    expect(container.querySelector('img[src="/icons/32.png"]')).toBeNull();

    // Logo is an inline <svg> — the element immediately before the wordmark.
    // getByRole("heading") avoids matching the <title>Tamiz</title> inside the SVG.
    const wordmark = screen.getByRole("heading", { name: "Tamiz" });
    const logo = wordmark.previousElementSibling as SVGSVGElement | null;

    expect(logo).not.toBeNull();
    expect(logo?.tagName.toLowerCase()).toBe("svg");
    expect(logo?.getAttribute("aria-hidden")).toBe("true");

    // Logo mark appears to the LEFT of (before) the wordmark — the core branding
    // contract from the spec scenario "Popup displays icon as inline SVG".
    expect(logo?.compareDocumentPosition(wordmark)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("places the logo mark and wordmark as siblings in a single header container", () => {
    render(() => <App />);

    const wordmark = screen.getByRole("heading", { name: "Tamiz" });
    const logo = wordmark.previousElementSibling as SVGSVGElement | null;

    // Triangulation: must be an SVG (not an img), confirming inline SVG rendering.
    expect(logo?.tagName.toLowerCase()).toBe("svg");

    // The logo + wordmark share one parent (the flex header), proving they are
    // grouped rather than loosely scattered in the layout.
    expect(logo?.parentElement).toBe(wordmark.parentElement);

    // The header container is a plain div, not the Select wrapper (no contamination).
    expect(wordmark.parentElement?.tagName.toLowerCase()).toBe("div");
  });
});
