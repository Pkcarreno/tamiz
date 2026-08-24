import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { Kbd } from "./kbd.tsx";

describe("Kbd", () => {
  it("renders children inside a <kbd> element", () => {
    render(() => <Kbd>C</Kbd>);
    const kbd = screen.getByText("C");
    expect(kbd.tagName).toBe("KBD");
  });

  it("applies correct classes", () => {
    render(() => <Kbd>Esc</Kbd>);
    const kbd = screen.getByText("Esc");
    expect(kbd.className).toContain("font-mono");
    expect(kbd.className).toContain("rounded-[3px]");
    expect(kbd.className).toContain("border");
    expect(kbd.className).toContain("bg-ground");
  });
});
