import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelectionIndicator } from "./selection-indicator.tsx";

describe("SelectionIndicator", () => {
  const originalMatchMedia = window.matchMedia;
  const noop = vi.fn();
  const alwaysVisible = () => true;
  const neverVisible = () => false;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe("when visible", () => {
    it("renders the instruction text", () => {
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={alwaysVisible} />
      ));
      expect(screen.getByText("Click an element to select")).toBeTruthy();
      unmount();
    });

    it("renders the Esc hint text", () => {
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={alwaysVisible} />
      ));
      expect(screen.getByText("or press Esc")).toBeTruthy();
      unmount();
    });

    it("renders a close button with accessible aria-label", () => {
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={alwaysVisible} />
      ));
      expect(
        screen.getByRole("button", { name: "Dismiss selection (Esc)" })
      ).toBeTruthy();
      unmount();
    });

    it("renders the close button as a native button element", () => {
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={alwaysVisible} />
      ));
      const button = screen.getByRole("button", {
        name: "Dismiss selection (Esc)",
      });
      expect(button.tagName).toBe("BUTTON");
      unmount();
    });

    it("renders the Lucide X icon as close button content", () => {
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={alwaysVisible} />
      ));
      const button = screen.getByRole("button", {
        name: "Dismiss selection (Esc)",
      });
      expect(button.querySelector("svg")).not.toBeNull();
      unmount();
    });

    it("renders the dismiss button at slim size (24px height)", () => {
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={alwaysVisible} />
      ));
      const button = screen.getByRole("button", {
        name: "Dismiss selection (Esc)",
      });
      expect(button.className).toContain("h-[24px]");
      unmount();
    });

    it("marks the container with data-tamiz-ui for blocker exclusion", () => {
      const { container, unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={alwaysVisible} />
      ));
      expect(container.querySelector("[data-tamiz-ui]")).not.toBeNull();
      unmount();
    });
  });

  describe("when not visible", () => {
    it("does not render the pill", () => {
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={noop} visible={neverVisible} />
      ));
      expect(screen.queryByText("Click an element to select")).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
      unmount();
    });
  });

  describe("close button interaction", () => {
    it("calls onDismiss when the close button is clicked", () => {
      const onDismiss = vi.fn();
      const { unmount } = render(() => (
        <SelectionIndicator onDismiss={onDismiss} visible={alwaysVisible} />
      ));
      fireEvent.click(
        screen.getByRole("button", { name: "Dismiss selection (Esc)" })
      );
      expect(onDismiss).toHaveBeenCalledOnce();
      unmount();
    });
  });

  describe("exit animation", () => {
    it("keeps the pill visible during exit then removes after 120ms", async () => {
      const [visible, setVisible] = createSignal(true);
      render(() => (
        <SelectionIndicator onDismiss={vi.fn()} visible={visible} />
      ));

      expect(screen.getByText("Click an element to select")).toBeTruthy();

      setVisible(false);
      // Yield to let the SolidJS effect run and start the 120ms exit timer
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Pill still visible during exit animation (timer hasn't fired)
      expect(screen.getByText("Click an element to select")).toBeTruthy();

      // Wait past the 120ms exit duration for the timer to fire and DOM to update
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(screen.queryByText("Click an element to select")).toBeNull();
    });

    it("does not remove the pill before 120ms elapses", async () => {
      const [visible, setVisible] = createSignal(true);
      render(() => (
        <SelectionIndicator onDismiss={vi.fn()} visible={visible} />
      ));

      setVisible(false);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // At 50ms, the 120ms timer hasn't fired yet — pill must still be visible
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.queryByText("Click an element to select")).toBeTruthy();
    });
  });

  describe("prefers-reduced-motion", () => {
    it("removes the pill immediately without a 120ms delay", async () => {
      window.matchMedia = vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      });

      const [visible, setVisible] = createSignal(true);
      render(() => (
        <SelectionIndicator onDismiss={vi.fn()} visible={visible} />
      ));

      expect(screen.getByText("Click an element to select")).toBeTruthy();

      setVisible(false);
      // With reduced motion, setMounted(false) is called directly in the effect
      // (no setTimeout timer). Yield to let the effect and DOM update run.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(screen.queryByText("Click an element to select")).toBeNull();
    });

    it("pill is not visible for 120ms during reduced-motion dismiss", async () => {
      window.matchMedia = vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      });

      const [visible, setVisible] = createSignal(true);
      render(() => (
        <SelectionIndicator onDismiss={vi.fn()} visible={visible} />
      ));

      setVisible(false);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Pill is removed immediately — even after 120ms it stays removed
      await new Promise((resolve) => setTimeout(resolve, 130));
      expect(screen.queryByText("Click an element to select")).toBeNull();
    });
  });
});
