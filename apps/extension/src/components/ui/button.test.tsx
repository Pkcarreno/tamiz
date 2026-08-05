import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button.tsx";

describe("Button", () => {
  afterEach(() => cleanup());

  it("renders with primary variant by default", () => {
    render(() => <Button>Click me</Button>);
    const btn = screen.getByText("Click me") as HTMLButtonElement;
    expect(btn.classList.contains("bg-focus")).toBe(true);
    expect(btn.classList.contains("text-text-on-focus")).toBe(true);
    expect(btn.classList.contains("border-focus")).toBe(true);
    expect(btn.type).toBe("button");
  });

  it("renders secondary variant", () => {
    render(() => <Button variant="secondary">Secondary</Button>);
    const btn = screen.getByText("Secondary") as HTMLButtonElement;
    expect(btn.classList.contains("bg-surface-glass")).toBe(true);
    expect(btn.classList.contains("text-text")).toBe(true);
    expect(btn.classList.contains("border-border")).toBe(true);
  });

  it("renders ghost variant", () => {
    render(() => <Button variant="ghost">Ghost</Button>);
    const btn = screen.getByText("Ghost") as HTMLButtonElement;
    expect(btn.classList.contains("text-text-secondary")).toBe(true);
    expect(btn.classList.contains("bg-transparent")).toBe(true);
  });

  it("renders icon variant with primary colors and zero padding", () => {
    render(() => (
      <Button variant="icon">
        <span>🎉</span>
      </Button>
    ));
    const btn = screen.getByText("🎉").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("bg-focus")).toBe(true);
    expect(btn.classList.contains("p-0")).toBe(true);
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

  it("uses hover:enabled: prefix so disabled buttons never receive hover styles", () => {
    render(() => <Button variant="primary">Click</Button>);
    const btn = screen.getByText("Click") as HTMLButtonElement;
    expect(btn.classList.contains("hover:enabled:bg-focus-bright")).toBe(true);
  });

  it("renders sm size", () => {
    render(() => <Button size="sm">Small</Button>);
    const btn = screen.getByText("Small") as HTMLButtonElement;
    expect(btn.classList.contains("h-[28px]")).toBe(true);
    expect(btn.classList.contains("px-2")).toBe(true);
  });

  it("renders md size", () => {
    render(() => <Button size="md">Medium</Button>);
    const btn = screen.getByText("Medium") as HTMLButtonElement;
    expect(btn.classList.contains("h-[34px]")).toBe(true);
    expect(btn.classList.contains("px-4")).toBe(true);
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
    expect(btn.classList.contains("bg-focus")).toBe(true);
    expect(btn.classList.contains("custom-class")).toBe(true);
  });

  it("renders icon variant with md square dimensions by default", () => {
    render(() => (
      <Button variant="icon">
        <span>⭐</span>
      </Button>
    ));
    const btn = screen.getByText("⭐").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("w-[34px]")).toBe(true);
    expect(btn.classList.contains("h-[34px]")).toBe(true);
  });

  it("renders icon variant with sm square dimensions when size is sm", () => {
    render(() => (
      <Button size="sm" variant="icon">
        <span>⭐</span>
      </Button>
    ));
    const btn = screen.getByText("⭐").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("w-[28px]")).toBe(true);
    expect(btn.classList.contains("h-[28px]")).toBe(true);
  });
});
