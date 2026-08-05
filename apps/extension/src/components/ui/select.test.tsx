import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SelectOption } from "./select.tsx";
import { Select } from "./select.tsx";

const options: SelectOption[] = [
  { label: "Markdown", value: "markdown" },
  { label: "Raw HTML", value: "raw" },
];

describe("Select", () => {
  afterEach(() => cleanup());

  it("renders all options as buttons", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} value="markdown" />
    ));
    expect(screen.getByText("Markdown")).toBeTruthy();
    expect(screen.getByText("Raw HTML")).toBeTruthy();
  });

  it("calls onChange with the selected value", () => {
    const onChange = vi.fn();
    render(() => (
      <Select onChange={onChange} options={options} value="markdown" />
    ));
    fireEvent.click(screen.getByText("Raw HTML") as HTMLButtonElement);
    expect(onChange).toHaveBeenCalledWith("raw", expect.any(Event));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("marks the active option with active background", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} value="markdown" />
    ));
    const activeBtn = screen.getByText("Markdown") as HTMLButtonElement;
    const inactiveBtn = screen.getByText("Raw HTML") as HTMLButtonElement;
    expect(activeBtn.classList.contains("bg-focus")).toBe(true);
    expect(activeBtn.classList.contains("text-text-on-focus")).toBe(true);
    expect(inactiveBtn.classList.contains("bg-focus")).toBe(false);
  });

  it("updates active state when value changes", () => {
    function SelectWithState() {
      const [value, setValue] = createSignal("markdown");
      const handleChange = setValue;
      const handleClick = () => {
        setValue("raw");
      };
      return (
        <div>
          <Select onChange={handleChange} options={options} value={value()} />
          {/* biome-ignore lint/performance/noJsxPropsBind: test helper, rendered once */}
          <button onClick={handleClick} type="button">
            Change
          </button>
        </div>
      );
    }

    render(() => <SelectWithState />);

    const markdownBtn = screen.getByText("Markdown") as HTMLButtonElement;
    expect(markdownBtn.classList.contains("bg-focus")).toBe(true);

    fireEvent.click(screen.getByText("Change") as HTMLButtonElement);

    const rawBtn = screen.getByText("Raw HTML") as HTMLButtonElement;
    expect(rawBtn.classList.contains("bg-focus")).toBe(true);
    expect(markdownBtn.classList.contains("bg-focus")).toBe(false);
  });

  it("applies sm size styles to option buttons", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} size="sm" value="markdown" />
    ));
    const btn = screen.getByText("Markdown") as HTMLButtonElement;
    expect(btn.classList.contains("h-[28px]")).toBe(true);
    expect(btn.classList.contains("px-2")).toBe(true);
    expect(btn.classList.contains("text-xs")).toBe(true);
  });

  it("uses md size styles by default", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} value="markdown" />
    ));
    const btn = screen.getByText("Markdown") as HTMLButtonElement;
    expect(btn.classList.contains("h-[34px]")).toBe(true);
    expect(btn.classList.contains("px-3")).toBe(true);
  });

  it("applies structural classes based on option position", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} value="markdown" />
    ));
    const mdBtn = screen.getByText("Markdown") as HTMLButtonElement;
    const rawBtn = screen.getByText("Raw HTML") as HTMLButtonElement;
    // First option gets left rounded corner
    expect(mdBtn.classList.contains("rounded-l-md")).toBe(true);
    // Last option gets right rounded corner
    expect(rawBtn.classList.contains("rounded-r-md")).toBe(true);
    // First (non-last) option gets right border
    expect(mdBtn.classList.contains("border-r")).toBe(true);
    // Last option does not get right border
    expect(rawBtn.classList.contains("border-r")).toBe(false);
  });

  it("excludes hover utilities from active options", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} value="markdown" />
    ));
    const activeBtn = screen.getByText("Markdown") as HTMLButtonElement;
    const inactiveBtn = screen.getByText("Raw HTML") as HTMLButtonElement;
    expect(activeBtn.classList.contains("hover:enabled:text-text")).toBe(false);
    expect(inactiveBtn.classList.contains("hover:enabled:text-text")).toBe(
      true
    );
  });

  it("merges custom class with default classes", () => {
    render(() => (
      <Select
        class="custom-select"
        onChange={vi.fn()}
        options={options}
        value="markdown"
      />
    ));
    const container = screen
      .getByText("Markdown")
      .closest("[data-tamiz-select]") as HTMLElement;
    expect(container.classList.contains("custom-select")).toBe(true);
    expect(container.classList.contains("inline-flex")).toBe(true);
  });
});
