import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Select, type SelectOption } from "./select.tsx";

const options: SelectOption[] = [
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
];

describe("Select", () => {
  afterEach(() => cleanup());

  it("renders all options inside a native select element", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.options).toHaveLength(2);
    expect(select.options[0]?.value).toBe("markdown");
    expect(select.options[0]?.textContent).toBe("Markdown");
    expect(select.options[1]?.value).toBe("html");
    expect(select.options[1]?.textContent).toBe("HTML");
  });

  it("renders a single option correctly", () => {
    const singleOptions: SelectOption[] = [{ label: "Only", value: "only" }];
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={singleOptions}
        value="only"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    expect(select.options[0]?.value).toBe("only");
    expect(select.options[0]?.textContent).toBe("Only");
  });

  it("calls onChange with the selected value when an option is chosen", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <Select
        onChange={onChange}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "html" } });
    expect(onChange).toHaveBeenCalledWith("html");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls onChange with markdown when switching back from html", () => {
    const onChange = vi.fn();
    const { container } = render(() => (
      <Select
        onChange={onChange}
        options={options}
        value="html"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "markdown" } });
    expect(onChange).toHaveBeenCalledWith("markdown");
  });

  it("reflects the current value via select.value and selected option", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="html"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.value).toBe("html");
    expect(select.options[1]?.selected).toBe(true);
  });

  it("reflects markdown as the selected value", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.value).toBe("markdown");
    expect(select.options[0]?.selected).toBe(true);
  });

  it("renders a chevron SVG that inherits text color via currentColor", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const svg = container.querySelector("[data-tamiz-select] svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("fill")).toBe("currentColor");
  });

  it("renders both subtle and standard variants without errors", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="subtle"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    expect(select.value).toBe("markdown");
  });

  it("passes the id prop to the native select element", () => {
    const { container } = render(() => (
      <Select
        id="format-select"
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.id).toBe("format-select");
  });

  it("does not set id when id prop is not provided", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.id).toBe("");
  });

  it("merges a custom class into the select element", () => {
    const { container } = render(() => (
      <Select
        class="my-custom-class"
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).toContain("my-custom-class");
  });

  it("merges multiple custom classes into the select element", () => {
    const { container } = render(() => (
      <Select
        class="class-a class-b"
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).toContain("class-a");
    expect(select.className).toContain("class-b");
  });

  it("sets disabled attribute when disabled prop is true", () => {
    const { container } = render(() => (
      <Select
        disabled
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it("is not disabled by default", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.disabled).toBe(false);
  });

  it("renders a path element inside the chevron SVG", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const path = container.querySelector("[data-tamiz-select] svg path");
    expect(path).not.toBeNull();
  });

  it("preserves data-tamiz-select attribute on the container", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    expect(container.querySelector("[data-tamiz-select]")).not.toBeNull();
  });

  it("applies focus:shadow-focus class for focus ring", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).toContain("focus-visible:shadow-focus");
  });

  it("renders an empty select when options array is empty", () => {
    const { container } = render(() => (
      <Select onChange={vi.fn()} options={[]} value="" variant="standard" />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.options).toHaveLength(0);
  });

  it("forwards the name attribute to the native select element", () => {
    const { container } = render(() => (
      <Select
        name="format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.name).toBe("format");
  });

  it("forwards the aria-label attribute to the native select element", () => {
    const { container } = render(() => (
      <Select
        aria-label="Choose format"
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.getAttribute("aria-label")).toBe("Choose format");
  });

  it("forwards the tabIndex attribute to the native select element", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        tabIndex={-1}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.tabIndex).toBe(-1);
  });

  it("forwards data-* attributes to the native select element", () => {
    const { container } = render(() => (
      <Select
        data-testid="my-select"
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.getAttribute("data-testid")).toBe("my-select");
  });

  it("does not include color-scheme:light in select classes", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).not.toContain("color-scheme:light");
  });

  it("renders subtle variant at 32px height", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="subtle"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).toContain("h-[32px]");
  });

  it("renders standard variant at 32px height", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).toContain("h-[32px]");
  });

  it("does not use the undefined bg-surface-glass-hover token", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).not.toContain("bg-surface-glass-hover");
  });

  it("uses text-accent on hover for standard variant", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="standard"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).toContain("hover:enabled:text-accent");
  });

  it("uses text-accent on hover for subtle variant", () => {
    const { container } = render(() => (
      <Select
        onChange={vi.fn()}
        options={options}
        value="markdown"
        variant="subtle"
      />
    ));
    const select = container.querySelector(
      "[data-tamiz-select] select"
    ) as HTMLSelectElement;
    expect(select.className).toContain("hover:enabled:text-accent");
  });
});
