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
      const radioGroups = container.querySelectorAll(
        "[data-tamiz-radio-group]"
      );
      const [formatGroup] = radioGroups;
      const radioItems = formatGroup.querySelectorAll(
        "[data-tamiz-radio-item]"
      );
      expect(radioItems).toHaveLength(2);
    });
  });

  it("loads the default format from storage on mount", async () => {
    const { container } = render(() => <OptionsApp />);
    await waitFor(() => {
      const radioGroups = container.querySelectorAll(
        "[data-tamiz-radio-group]"
      );
      const [formatGroup] = radioGroups;
      const radioItems = formatGroup.querySelectorAll(
        "[data-tamiz-radio-item]"
      );
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

describe("OptionsApp — Theme Preference", () => {
  it("renders a Theme Preference heading", () => {
    const { container } = render(() => <OptionsApp />);
    const headings = container.querySelectorAll("h1");
    const themeHeading = Array.from(headings).find(
      (h) => h.textContent === "Theme"
    );
    expect(themeHeading).toBeDefined();
  });

  it("renders three theme RadioGroup options (Light, Dark, Auto)", async () => {
    const { container } = render(() => <OptionsApp />);
    await waitFor(() => {
      const radioGroups = container.querySelectorAll(
        "[data-tamiz-radio-group]"
      );
      expect(radioGroups.length).toBeGreaterThanOrEqual(2);
      const [, themeGroup] = radioGroups;
      const items = themeGroup.querySelectorAll("[data-tamiz-radio-item]");
      expect(items).toHaveLength(3);
    });
  });

  it("loads the default theme preference (auto) on mount", async () => {
    const { container } = render(() => <OptionsApp />);
    await waitFor(() => {
      const radioGroups = container.querySelectorAll(
        "[data-tamiz-radio-group]"
      );
      const [, themeGroup] = radioGroups;
      const items = themeGroup.querySelectorAll("[data-tamiz-radio-item]");
      const selected = Array.from(items).find(
        (item) => item.getAttribute("aria-checked") === "true"
      );
      expect(selected).toBeDefined();
      expect(selected?.getAttribute("data-value")).toBe("auto");
    });
  });

  it("renders theme options with correct labels", async () => {
    const { container } = render(() => <OptionsApp />);
    await waitFor(() => {
      const radioGroups = container.querySelectorAll(
        "[data-tamiz-radio-group]"
      );
      const [, themeGroup] = radioGroups;
      const labels = themeGroup.querySelectorAll(
        "[data-tamiz-radio-item] span"
      );
      const texts = Array.from(labels).map((el) => el.textContent);
      expect(texts).toEqual(["Light", "Dark", "Auto"]);
    });
  });
});
