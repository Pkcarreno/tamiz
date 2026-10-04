import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PickerSessionSnapshot } from "../session/types.ts";
import {
  ADORNMENT_STYLE_ID,
  createPageAdornment,
  EXCLUDED_CLASS,
  EXCLUSION_CURSOR_CLASS,
  EXCLUSION_HOVER_CLASS,
  HIGHLIGHT_CLASS,
  HOVER_CLASS,
} from "./adornment.ts";

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element #${id} not found`);
  }
  return el;
}

function createSnapshot(
  overrides: Partial<PickerSessionSnapshot> = {}
): PickerSessionSnapshot {
  return {
    excludedElements: overrides.excludedElements ?? new Set(),
    format: overrides.format ?? "markdown",
    isExclusionMode: overrides.isExclusionMode ?? false,
    selectedElement: overrides.selectedElement ?? null,
    state: overrides.state ?? "IDLE",
  };
}

describe("PageAdornment", () => {
  let root: HTMLElement;
  let article: HTMLElement;
  let title: HTMLElement;
  let paragraph: HTMLElement;
  let span: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <article id="article">
          <h1 id="title">Article Title</h1>
          <p id="paragraph">Some text <span id="span">inside</span></p>
        </article>
      </div>
    `;

    root = requireElement("root");
    article = requireElement("article");
    title = requireElement("title");
    paragraph = requireElement("paragraph");
    span = requireElement("span");
  });

  afterEach(() => {
    document.getElementById(ADORNMENT_STYLE_ID)?.remove();
    document.documentElement.classList.remove(EXCLUSION_CURSOR_CLASS);
    document.body.innerHTML = "";
  });

  describe("Style injection & teardown", () => {
    it("injects a style element into document.head on creation", () => {
      const adornment = createPageAdornment({ documentRef: document });
      const style = document.getElementById(ADORNMENT_STYLE_ID);

      expect(style).not.toBeNull();
      expect(style?.textContent).toContain(`.${HIGHLIGHT_CLASS}`);
      expect(style?.textContent).toContain(`.${HOVER_CLASS}`);
      expect(style?.textContent).toContain(`.${EXCLUDED_CLASS}`);
      expect(style?.textContent).toContain(`.${EXCLUSION_HOVER_CLASS}`);
      expect(style?.textContent).toContain(`.${EXCLUSION_CURSOR_CLASS}`);
      expect(style?.textContent).toContain("z-index: 2147483647");

      adornment.dispose();
    });

    it("does not duplicate style element on multiple creations", () => {
      const a1 = createPageAdornment({ documentRef: document });
      const a2 = createPageAdornment({ documentRef: document });

      expect(document.querySelectorAll(`#${ADORNMENT_STYLE_ID}`).length).toBe(
        1
      );

      a1.dispose();
      a2.dispose();
    });

    it("removes the style element on dispose", () => {
      const adornment = createPageAdornment({ documentRef: document });
      expect(document.getElementById(ADORNMENT_STYLE_ID)).not.toBeNull();

      adornment.dispose();
      expect(document.getElementById(ADORNMENT_STYLE_ID)).toBeNull();
    });
  });

  describe("Scrim overlay lifecycle", () => {
    it("shows scrim on HIGHLIGHTING state", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));

      const scrim = document.querySelector("[data-tamiz-ui]");
      expect(scrim).not.toBeNull();
      expect((scrim as HTMLElement).style.position).toBe("fixed");
      expect((scrim as HTMLElement).style.pointerEvents).toBe("none");
      expect((scrim as HTMLElement).style.zIndex).toBe("2147483646");

      adornment.dispose();
    });

    it("keeps scrim visible on SELECTED state", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));
      adornment.update(
        createSnapshot({ selectedElement: article, state: "SELECTED" })
      );

      expect(document.querySelector("[data-tamiz-ui]")).not.toBeNull();

      adornment.dispose();
    });

    it("hides scrim on IDLE state", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));
      expect(document.querySelector("[data-tamiz-ui]")).not.toBeNull();

      adornment.update(createSnapshot({ state: "IDLE" }));
      expect(document.querySelector("[data-tamiz-ui]")).toBeNull();

      adornment.dispose();
    });

    it("removes scrim on dispose", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));
      expect(document.querySelector("[data-tamiz-ui]")).not.toBeNull();

      adornment.dispose();
      expect(document.querySelector("[data-tamiz-ui]")).toBeNull();
    });

    it("fails open if document.body.appendChild throws (CSP protection)", () => {
      const appendSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation(() => {
          throw new Error("CSP violation");
        });

      const adornment = createPageAdornment({ documentRef: document });
      expect(() => {
        adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));
      }).not.toThrow();

      appendSpy.mockRestore();
      adornment.dispose();
    });
  });

  describe("Selection outline", () => {
    it("applies highlight class to selectedElement on SELECTED state", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(
        createSnapshot({ selectedElement: article, state: "SELECTED" })
      );

      expect(article.classList.contains(HIGHLIGHT_CLASS)).toBe(true);
      adornment.dispose();
    });

    it("swaps highlight when selectedElement changes", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(
        createSnapshot({ selectedElement: article, state: "SELECTED" })
      );
      expect(article.classList.contains(HIGHLIGHT_CLASS)).toBe(true);

      adornment.update(
        createSnapshot({ selectedElement: title, state: "SELECTED" })
      );
      expect(article.classList.contains(HIGHLIGHT_CLASS)).toBe(false);
      expect(title.classList.contains(HIGHLIGHT_CLASS)).toBe(true);

      adornment.dispose();
    });

    it("clears highlight when returning to IDLE or HIGHLIGHTING", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(
        createSnapshot({ selectedElement: article, state: "SELECTED" })
      );
      expect(article.classList.contains(HIGHLIGHT_CLASS)).toBe(true);

      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));
      expect(article.classList.contains(HIGHLIGHT_CLASS)).toBe(false);

      adornment.dispose();
    });

    it("clears highlight on dispose", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(
        createSnapshot({ selectedElement: article, state: "SELECTED" })
      );
      expect(article.classList.contains(HIGHLIGHT_CLASS)).toBe(true);

      adornment.dispose();
      expect(article.classList.contains(HIGHLIGHT_CLASS)).toBe(false);
    });
  });

  describe("Hover outline", () => {
    it("applies hover class in HIGHLIGHTING state for selectable elements", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));

      adornment.setHoverTarget(title);
      expect(title.classList.contains(HOVER_CLASS)).toBe(true);

      adornment.dispose();
    });

    it("swaps hover class when moving to another element", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));

      adornment.setHoverTarget(title);
      expect(title.classList.contains(HOVER_CLASS)).toBe(true);

      adornment.setHoverTarget(paragraph);
      expect(title.classList.contains(HOVER_CLASS)).toBe(false);
      expect(paragraph.classList.contains(HOVER_CLASS)).toBe(true);

      adornment.dispose();
    });

    it("clears hover class when target is null", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));

      adornment.setHoverTarget(title);
      expect(title.classList.contains(HOVER_CLASS)).toBe(true);

      adornment.setHoverTarget(null);
      expect(title.classList.contains(HOVER_CLASS)).toBe(false);

      adornment.dispose();
    });

    it("ignores non-selectable elements, body, or documentElement", () => {
      const uiElement = document.createElement("div");
      uiElement.setAttribute("data-tamiz-ui", "");
      document.body.appendChild(uiElement);

      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));

      adornment.setHoverTarget(uiElement);
      expect(uiElement.classList.contains(HOVER_CLASS)).toBe(false);

      adornment.setHoverTarget(document.body);
      expect(document.body.classList.contains(HOVER_CLASS)).toBe(false);

      adornment.setHoverTarget(document.documentElement);
      expect(document.documentElement.classList.contains(HOVER_CLASS)).toBe(
        false
      );

      adornment.dispose();
    });

    it("clears hover when snapshot transitions from HIGHLIGHTING to SELECTED", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(createSnapshot({ state: "HIGHLIGHTING" }));

      adornment.setHoverTarget(title);
      expect(title.classList.contains(HOVER_CLASS)).toBe(true);

      adornment.update(
        createSnapshot({ selectedElement: article, state: "SELECTED" })
      );
      expect(title.classList.contains(HOVER_CLASS)).toBe(false);

      adornment.dispose();
    });
  });

  describe("Exclusion mode, cursor, and hover", () => {
    it("toggles exclusion cursor class on documentElement", () => {
      const adornment = createPageAdornment({ documentRef: document });

      adornment.update(
        createSnapshot({
          isExclusionMode: true,
          selectedElement: article,
          state: "SELECTED",
        })
      );
      expect(
        document.documentElement.classList.contains(EXCLUSION_CURSOR_CLASS)
      ).toBe(true);

      adornment.update(
        createSnapshot({
          isExclusionMode: false,
          selectedElement: article,
          state: "SELECTED",
        })
      );
      expect(
        document.documentElement.classList.contains(EXCLUSION_CURSOR_CLASS)
      ).toBe(false);

      adornment.dispose();
    });

    it("applies exclusion-hover only to descendants of selectedElement", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(
        createSnapshot({
          isExclusionMode: true,
          selectedElement: article,
          state: "SELECTED",
        })
      );

      // Child element inside article -> valid
      adornment.setHoverTarget(title);
      expect(title.classList.contains(EXCLUSION_HOVER_CLASS)).toBe(true);

      // Selected element itself -> invalid
      adornment.setHoverTarget(article);
      expect(article.classList.contains(EXCLUSION_HOVER_CLASS)).toBe(false);

      // Element outside article -> invalid
      adornment.setHoverTarget(root);
      expect(root.classList.contains(EXCLUSION_HOVER_CLASS)).toBe(false);

      adornment.dispose();
    });
  });

  describe("Exclusion markers diffing", () => {
    it("applies and removes excluded class based on excludedElements set", () => {
      const adornment = createPageAdornment({ documentRef: document });

      adornment.update(
        createSnapshot({
          excludedElements: new Set([title]),
          selectedElement: article,
          state: "SELECTED",
        })
      );
      expect(title.classList.contains(EXCLUDED_CLASS)).toBe(true);
      expect(paragraph.classList.contains(EXCLUDED_CLASS)).toBe(false);

      // Add paragraph, keep title
      adornment.update(
        createSnapshot({
          excludedElements: new Set([title, paragraph]),
          selectedElement: article,
          state: "SELECTED",
        })
      );
      expect(title.classList.contains(EXCLUDED_CLASS)).toBe(true);
      expect(paragraph.classList.contains(EXCLUDED_CLASS)).toBe(true);

      // Remove title, keep paragraph
      adornment.update(
        createSnapshot({
          excludedElements: new Set([paragraph]),
          selectedElement: article,
          state: "SELECTED",
        })
      );
      expect(title.classList.contains(EXCLUDED_CLASS)).toBe(false);
      expect(paragraph.classList.contains(EXCLUDED_CLASS)).toBe(true);

      adornment.dispose();
      expect(paragraph.classList.contains(EXCLUDED_CLASS)).toBe(false);
    });

    it("clears all excluded classes on dispose", () => {
      const adornment = createPageAdornment({ documentRef: document });
      adornment.update(
        createSnapshot({
          excludedElements: new Set([title, span]),
          selectedElement: article,
          state: "SELECTED",
        })
      );

      expect(title.classList.contains(EXCLUDED_CLASS)).toBe(true);
      expect(span.classList.contains(EXCLUDED_CLASS)).toBe(true);

      adornment.dispose();
      expect(title.classList.contains(EXCLUDED_CLASS)).toBe(false);
      expect(span.classList.contains(EXCLUDED_CLASS)).toBe(false);
    });
  });
});
