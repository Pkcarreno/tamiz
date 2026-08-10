import { cleanup, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "../src/entrypoints/popup/main.tsx";

describe("popup header branding", () => {
  afterEach(() => cleanup());

  it("renders the 18px logo mark before the Tamiz wordmark in DOM order", () => {
    const { container } = render(() => <App />);

    const logo = container.querySelector(
      'img[src="/icons/32.png"]'
    ) as HTMLImageElement;
    const wordmark = screen.getByText("Tamiz");

    expect(logo).not.toBeNull();
    expect(logo.getAttribute("width")).toBe("18");
    expect(logo.getAttribute("height")).toBe("18");
    // Logo mark appears to the LEFT of (before) the wordmark — the core branding
    // contract from the spec scenario "Popup header shows logo mark".
    expect(logo.compareDocumentPosition(wordmark)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("places the logo mark and wordmark as siblings in a single header container", () => {
    const { container } = render(() => <App />);

    const logo = container.querySelector(
      'img[src="/icons/32.png"]'
    ) as HTMLImageElement;
    const wordmark = screen.getByText("Tamiz");

    // Triangulation: the logo + wordmark share one parent (the flex header),
    // proving they are grouped rather than loosely scattered in the layout.
    expect(logo.parentElement).toBe(wordmark.parentElement);
    expect(logo.compareDocumentPosition(wordmark)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });
});
