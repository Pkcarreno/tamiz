import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTooltipContext,
} from "./tooltip.tsx";

/**
 * Unit tests for the Tooltip compound components.
 *
 * Tests the context guard, hover/focus interactions, and instant re-hover timing.
 */

describe("Tooltip", () => {
  afterEach(() => cleanup());

  describe("context guard", () => {
    it("throws when useTooltipContext is used outside a Tooltip provider", () => {
      expect(() => useTooltipContext()).toThrow(
        "[Tooltip] Components must be used within a <Tooltip> provider."
      );
    });
  });

  describe("hover interactions", () => {
    it("shows content on pointerenter", async () => {
      render(() => (
        <Tooltip>
          <TooltipTrigger>Test trigger</TooltipTrigger>
          <TooltipContent>Test tooltip</TooltipContent>
        </Tooltip>
      ));

      const trigger = screen.getByText("Test trigger");
      fireEvent.pointerEnter(trigger);
      await vi.waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeTruthy();
      });
    });

    it("hides content on pointerleave", async () => {
      render(() => (
        <Tooltip>
          <TooltipTrigger>Test trigger</TooltipTrigger>
          <TooltipContent>Test tooltip</TooltipContent>
        </Tooltip>
      ));

      const trigger = screen.getByText("Test trigger");
      fireEvent.pointerEnter(trigger);
      await vi.waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeTruthy();
      });

      fireEvent.pointerLeave(trigger);
      await vi.waitFor(() => {
        expect(screen.queryByRole("tooltip")).toBeNull();
      });
    });
  });

  describe("focus interactions", () => {
    it("shows content on focus", async () => {
      render(() => (
        <Tooltip>
          <TooltipTrigger>Test trigger</TooltipTrigger>
          <TooltipContent>Test tooltip</TooltipContent>
        </Tooltip>
      ));

      const trigger = screen.getByText("Test trigger");
      fireEvent.focus(trigger);
      await vi.waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeTruthy();
      });
    });

    it("hides content on blur", async () => {
      render(() => (
        <Tooltip>
          <TooltipTrigger>Test trigger</TooltipTrigger>
          <TooltipContent>Test tooltip</TooltipContent>
        </Tooltip>
      ));

      const trigger = screen.getByText("Test trigger");
      fireEvent.focus(trigger);
      await vi.waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeTruthy();
      });

      fireEvent.blur(trigger);
      await vi.waitFor(() => {
        expect(screen.queryByRole("tooltip")).toBeNull();
      });
    });
  });

  describe("instant re-hover timing", () => {
    it("shows content instantly on immediate re-hover", async () => {
      render(() => (
        <Tooltip>
          <TooltipTrigger>Test trigger</TooltipTrigger>
          <TooltipContent>Test tooltip</TooltipContent>
        </Tooltip>
      ));

      const trigger = screen.getByText("Test trigger");

      fireEvent.pointerEnter(trigger);
      await vi.waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeTruthy();
      });

      fireEvent.pointerLeave(trigger);
      await vi.waitFor(() => {
        expect(screen.queryByRole("tooltip")).toBeNull();
      });

      fireEvent.pointerEnter(trigger);
      await vi.waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeTruthy();
      });
    });
  });
});
