import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RadioGroup, type RadioOption } from "./radio-group.tsx";

const options: RadioOption[] = [
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
];

describe("RadioGroup", () => {
  afterEach(() => cleanup());

  it("renders all options as radio items", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain("Markdown");
    expect(items[1]?.textContent).toContain("HTML");
  });

  it("sets role='radiogroup' on the container", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const group = container.querySelector("[data-tamiz-radio-group]");
    expect(group?.getAttribute("role")).toBe("radiogroup");
  });

  it("sets role='radio' on each option", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    for (const item of items) {
      expect(item.getAttribute("role")).toBe("radio");
    }
  });

  it("sets aria-checked on the selected option", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="html"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    expect(items[0]?.getAttribute("aria-checked")).toBe("false");
    expect(items[1]?.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onChange when an option is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={onChange}
        options={options}
        value="markdown"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    const htmlItem = Array.from(items).find(
      (el) => el.getAttribute("data-value") === "html"
    );
    fireEvent.click(htmlItem as Element);
    expect(onChange).toHaveBeenCalledWith("html");
  });

  it("calls onChange with the same value when clicking the already selected option", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={onChange}
        options={options}
        value="markdown"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    const mdItem = Array.from(items).find(
      (el) => el.getAttribute("data-value") === "markdown"
    );
    fireEvent.click(mdItem as Element);
    expect(onChange).toHaveBeenCalledWith("markdown");
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <RadioGroup
        disabled
        name="format"
        onChange={onChange}
        options={options}
        value="markdown"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    const htmlItem = Array.from(items).find(
      (el) => el.getAttribute("data-value") === "html"
    );
    fireEvent.click(htmlItem as Element);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sets aria-disabled on the group when disabled", () => {
    const { container } = render(() => (
      <RadioGroup
        disabled
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const group = container.querySelector("[data-tamiz-radio-group]");
    expect(group?.getAttribute("aria-disabled")).toBe("true");
  });

  it("sets tabIndex=0 on the selected option and tabIndex=-1 on others", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="html"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    expect(items[0]?.getAttribute("tabindex")).toBe("-1");
    expect(items[1]?.getAttribute("tabindex")).toBe("0");
  });

  it("renders with horizontal orientation", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        orientation="horizontal"
        value="markdown"
      />
    ));
    const group = container.querySelector("[data-tamiz-radio-group]");
    expect(group?.getAttribute("aria-orientation")).toBe("horizontal");
    expect(group?.className).toContain("flex-row");
  });

  it("renders with vertical orientation by default", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const group = container.querySelector("[data-tamiz-radio-group]");
    expect(group?.getAttribute("aria-orientation")).toBe("vertical");
    expect(group?.className).toContain("flex-col");
  });

  it("applies custom class to the group", () => {
    const { container } = render(() => (
      <RadioGroup
        class="my-custom-class"
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const group = container.querySelector("[data-tamiz-radio-group]");
    expect(group?.className).toContain("my-custom-class");
  });

  it("passes id to the group element", () => {
    const { container } = render(() => (
      <RadioGroup
        id="format-group"
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const group = container.querySelector("[data-tamiz-radio-group]");
    expect(group?.id).toBe("format-group");
  });

  it("navigates with ArrowDown without selecting", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={onChange}
        options={options}
        value="markdown"
      />
    ));
    const items = container.querySelectorAll("[data-tamiz-radio-item]");
    const mdItem = Array.from(items).find(
      (el) => el.getAttribute("data-value") === "markdown"
    );
    fireEvent.keyDown(mdItem as Element, { key: "ArrowDown" });
    // ArrowDown moves focus but does not select
    expect(onChange).not.toHaveBeenCalled();
  });

  it("includes a visually hidden native radio input for form semantics", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const hiddenInputs = container.querySelectorAll(
      "[data-tamiz-radio-item] input[type='radio']"
    );
    expect(hiddenInputs).toHaveLength(2);
  });

  it("forwards name to hidden radio inputs", () => {
    const { container } = render(() => (
      <RadioGroup
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const hiddenInputs = container.querySelectorAll(
      "[data-tamiz-radio-item] input[type='radio']"
    );
    expect(hiddenInputs[0]?.getAttribute("name")).toBe("format");
    expect(hiddenInputs[1]?.getAttribute("name")).toBe("format");
  });
});
