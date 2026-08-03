import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button.tsx";

describe("Button", () => {
  afterEach(() => cleanup());

  it("renders with primary variant by default", () => {
    render(() => <Button>Click me</Button>);
    const btn = screen.getByText("Click me") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn")).toBe(true);
    expect(btn.classList.contains("tz-btn-primary")).toBe(true);
    expect(btn.type).toBe("button");
  });

  it("renders secondary variant", () => {
    render(() => <Button variant="secondary">Secondary</Button>);
    const btn = screen.getByText("Secondary") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn-secondary")).toBe(true);
  });

  it("renders ghost variant", () => {
    render(() => <Button variant="ghost">Ghost</Button>);
    const btn = screen.getByText("Ghost") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn-ghost")).toBe(true);
  });

  it("renders icon variant as square with no text padding", () => {
    render(() => (
      <Button variant="icon">
        <span>🎉</span>
      </Button>
    ));
    const btn = screen.getByText("🎉").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn-icon")).toBe(true);
    expect(btn.classList.contains("tz-btn-primary")).toBe(true);
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(() => <Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText("Click") as HTMLButtonElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders with disabled attribute when disabled prop is set", () => {
    render(() => <Button disabled>Click</Button>);
    const btn = screen.getByText("Click") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains("tz-btn")).toBe(true);
  });

  it("renders sm size", () => {
    render(() => <Button size="sm">Small</Button>);
    const btn = screen.getByText("Small") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn-sm")).toBe(true);
  });

  it("renders md size", () => {
    render(() => <Button size="md">Medium</Button>);
    const btn = screen.getByText("Medium") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn-md")).toBe(true);
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
    expect(btn.classList.contains("tz-btn-primary")).toBe(true);
    expect(btn.classList.contains("custom-class")).toBe(true);
  });

  it("renders icon variant with icon-md size class by default", () => {
    render(() => (
      <Button variant="icon">
        <span>⭐</span>
      </Button>
    ));
    const btn = screen.getByText("⭐").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn-icon-md")).toBe(true);
  });

  it("renders icon variant with icon-sm size class when size is sm", () => {
    render(() => (
      <Button size="sm" variant="icon">
        <span>⭐</span>
      </Button>
    ));
    const btn = screen.getByText("⭐").closest("button") as HTMLButtonElement;
    expect(btn.classList.contains("tz-btn-icon-sm")).toBe(true);
  });
});
