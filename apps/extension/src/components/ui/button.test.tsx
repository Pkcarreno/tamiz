import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button.tsx";

describe("Button", () => {
  afterEach(() => cleanup());

  it("renders with ghost variant by default", () => {
    render(() => <Button>Click me</Button>);
    const btn = screen.getByText("Click me") as HTMLButtonElement;
    expect(btn.classList.contains("bg-transparent")).toBe(true);
    expect(btn.classList.contains("text-text-secondary")).toBe(true);
    expect(btn.type).toBe("button");
  });

  it("renders ghost variant", () => {
    render(() => <Button variant="ghost">Ghost</Button>);
    const btn = screen.getByText("Ghost") as HTMLButtonElement;
    expect(btn.classList.contains("text-text-secondary")).toBe(true);
    expect(btn.classList.contains("bg-transparent")).toBe(true);
  });

  it("renders icon variant with transparent background and zero padding", () => {
    render(() => (
      <Button variant="icon">
        <span>Icon</span>
      </Button>
    ));
    const btn = screen.getByText("Icon").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("bg-transparent")).toBe(true);
    expect(btn.classList.contains("p-0")).toBe(true);
    expect(btn.classList.contains("text-text-tertiary")).toBe(true);
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(() => <Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText("Click") as HTMLButtonElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies disabled utilities when disabled prop is set", () => {
    render(() => <Button disabled>Click</Button>);
    const btn = screen.getByText("Click") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("disabled:cursor-not-allowed")).toBe(true);
    expect(btn.classList.contains("disabled:opacity-[0.35]")).toBe(true);
  });

  it("renders xs size (default)", () => {
    render(() => <Button>Small</Button>);
    const btn = screen.getByText("Small") as HTMLButtonElement;
    expect(btn.classList.contains("h-[24px]")).toBe(true);
    expect(btn.classList.contains("px-1.5")).toBe(true);
  });

  it("renders sm size", () => {
    render(() => <Button size="sm">Small</Button>);
    const btn = screen.getByText("Small") as HTMLButtonElement;
    expect(btn.classList.contains("h-[26px]")).toBe(true);
    expect(btn.classList.contains("px-2")).toBe(true);
  });

  it("passes through arbitrary attributes", () => {
    render(() => (
      <Button id="my-btn" type="submit">
        Submit
      </Button>
    ));
    const btn = screen.getByText("Submit") as HTMLButtonElement;
    expect(btn.id).toBe("my-btn");
    expect(btn.type).toBe("submit");
  });

  it("merges custom class with variant classes", () => {
    render(() => <Button class="custom-class">Test</Button>);
    const btn = screen.getByText("Test") as HTMLButtonElement;
    expect(btn.classList.contains("bg-transparent")).toBe(true);
    expect(btn.classList.contains("custom-class")).toBe(true);
  });

  it("renders icon variant with xs square dimensions by default", () => {
    render(() => (
      <Button variant="icon">
        <span>Icon</span>
      </Button>
    ));
    const btn = screen.getByText("Icon").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("size-[24px]")).toBe(true);
  });

  it("renders icon variant with sm square dimensions when size is sm", () => {
    render(() => (
      <Button size="sm" variant="icon">
        <span>Icon</span>
      </Button>
    ));
    const btn = screen.getByText("Icon").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("size-[26px]")).toBe(true);
  });
});
