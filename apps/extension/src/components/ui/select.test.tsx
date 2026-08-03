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

  it("marks the active option", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} value="markdown" />
    ));
    const activeBtn = screen.getByText("Markdown") as HTMLButtonElement;
    const inactiveBtn = screen.getByText("Raw HTML") as HTMLButtonElement;
    expect(activeBtn.classList.contains("tz-select-option--active")).toBe(true);
    expect(inactiveBtn.classList.contains("tz-select-option--active")).toBe(
      false
    );
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
    expect(markdownBtn.classList.contains("tz-select-option--active")).toBe(
      true
    );

    fireEvent.click(screen.getByText("Change") as HTMLButtonElement);

    const rawBtn = screen.getByText("Raw HTML") as HTMLButtonElement;
    expect(rawBtn.classList.contains("tz-select-option--active")).toBe(true);
    expect(markdownBtn.classList.contains("tz-select-option--active")).toBe(
      false
    );
  });

  it("applies sm size class to container", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} size="sm" value="markdown" />
    ));
    const container = screen
      .getByText("Markdown")
      .closest(".tz-select") as HTMLElement;
    expect(container.classList.contains("tz-select-sm")).toBe(true);
    expect(container.classList.contains("tz-select-md")).toBe(false);
  });

  it("applies md size class to container by default", () => {
    render(() => (
      <Select onChange={vi.fn()} options={options} value="markdown" />
    ));
    const container = screen
      .getByText("Markdown")
      .closest(".tz-select") as HTMLElement;
    expect(container.classList.contains("tz-select-md")).toBe(true);
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
      .closest(".tz-select") as HTMLElement;
    expect(container.classList.contains("tz-select")).toBe(true);
    expect(container.classList.contains("custom-select")).toBe(true);
  });
});
