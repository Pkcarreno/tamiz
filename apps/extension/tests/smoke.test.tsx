import { cleanup, render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { browser } from "wxt/browser";

/** Minimal Solid component to verify the JSX transform + testing-library harness. */
function Greeting() {
  return <p data-testid="greeting">Hello from Solid</p>;
}

describe("test harness smoke", () => {
  it("exposes a callable fake browser runtime.sendMessage", () => {
    expect(typeof browser?.runtime?.sendMessage).toBe("function");
  });

  it("renders a Solid component into the jsdom document", () => {
    const { container } = render(() => <Greeting />);
    expect(container.querySelector('[data-testid="greeting"]')).not.toBeNull();
    expect(container.textContent).toContain("Hello from Solid");
    cleanup();
  });
});
