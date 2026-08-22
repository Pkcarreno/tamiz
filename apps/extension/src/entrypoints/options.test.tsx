import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { OptionsApp } from "../views/options-app.tsx";

afterEach(() => cleanup());

describe("OptionsApp", () => {
  it("renders a heading with the page title", () => {
    const { container } = render(() => <OptionsApp />);
    const heading = container.querySelector("h1");
    expect(heading?.textContent).toBe("Default Export Format");
  });

  it("renders the RadioGroup with format options", async () => {
    const { container } = render(() => <OptionsApp />);
    await waitFor(() => {
      const radioItems = container.querySelectorAll("[data-tamiz-radio-item]");
      expect(radioItems).toHaveLength(2);
    });
  });

  it("loads the default format from storage on mount", async () => {
    const { container } = render(() => <OptionsApp />);
    await waitFor(() => {
      const radioItems = container.querySelectorAll("[data-tamiz-radio-item]");
      const selected = Array.from(radioItems).find(
        (item) => item.getAttribute("aria-checked") === "true"
      );
      expect(selected).toBeDefined();
      expect(selected?.getAttribute("data-value")).toBe("markdown");
    });
  });

  it("renders a description paragraph", () => {
    const { container } = render(() => <OptionsApp />);
    const paragraph = container.querySelector("p");
    expect(paragraph?.textContent).toContain("format used when grabbing");
  });

  it("applies the tz-options class to the root container", () => {
    const { container } = render(() => <OptionsApp />);
    const root = container.querySelector(".tz-options");
    expect(root).not.toBeNull();
  });
});
