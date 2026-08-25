import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./toast.tsx";

function ToastTrigger(props: { message: string; duration?: number }) {
  const { showToast } = useToast();
  const handleClick = () => showToast(props.message, props.duration);
  return (
    // biome-ignore lint/performance/noJsxPropsBind: test helper, rendered once
    <button onClick={handleClick} type="button">
      Trigger
    </button>
  );
}

function MultiToastTrigger() {
  const { showToast } = useToast();
  const handleClick = () => {
    showToast("First toast");
    showToast("Second toast");
  };
  return (
    // biome-ignore lint/performance/noJsxPropsBind: test helper, rendered once
    <button onClick={handleClick} type="button">
      Multiple
    </button>
  );
}

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("shows a toast when showToast is called", () => {
    render(() => (
      <ToastProvider>
        <ToastTrigger message="Hello world" />
      </ToastProvider>
    ));

    fireEvent.click(screen.getByText("Trigger") as HTMLButtonElement);

    expect(screen.getByText("Hello world")).toBeTruthy();
    expect(screen.queryAllByTestId("tz-toast").length).toBe(1);
  });

  it("auto-dismisses after the default duration", async () => {
    vi.useFakeTimers();

    render(() => (
      <ToastProvider>
        <ToastTrigger message="Auto dismiss" />
      </ToastProvider>
    ));

    fireEvent.click(screen.getByText("Trigger") as HTMLButtonElement);
    expect(screen.getByText("Auto dismiss")).toBeTruthy();

    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.queryByText("Auto dismiss")).toBeNull();
  });

  it("auto-dismisses after a custom duration", async () => {
    vi.useFakeTimers();

    render(() => (
      <ToastProvider>
        <ToastTrigger duration={500} message="Quick toast" />
      </ToastProvider>
    ));

    fireEvent.click(screen.getByText("Trigger") as HTMLButtonElement);
    expect(screen.getByText("Quick toast")).toBeTruthy();

    await vi.advanceTimersByTimeAsync(500);
    expect(screen.queryByText("Quick toast")).toBeNull();
  });

  it("keeps other toasts when one auto-dismisses", async () => {
    vi.useFakeTimers();

    render(() => (
      <ToastProvider>
        <MultiToastTrigger />
      </ToastProvider>
    ));

    fireEvent.click(screen.getByText("Multiple") as HTMLButtonElement);
    expect(screen.getByText("First toast")).toBeTruthy();
    expect(screen.getByText("Second toast")).toBeTruthy();

    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.queryByText("First toast")).toBeNull();
    expect(screen.queryByText("Second toast")).toBeNull();
  });

  it("stacks multiple toasts", () => {
    render(() => (
      <ToastProvider>
        <MultiToastTrigger />
      </ToastProvider>
    ));

    fireEvent.click(screen.getByText("Multiple") as HTMLButtonElement);

    expect(screen.getByText("First toast")).toBeTruthy();
    expect(screen.getByText("Second toast")).toBeTruthy();
    expect(screen.queryAllByTestId("tz-toast").length).toBe(2);
  });

  it("throws when useToast is called outside a ToastProvider", () => {
    expect(() => render(() => useToast() as unknown as JSX.Element)).toThrow(
      "useToast must be used within a ToastProvider"
    );
  });
});
