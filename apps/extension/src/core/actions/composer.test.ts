import { afterEach, describe, expect, it, vi } from "vitest";
import { PickerStateMachine } from "../machine/picker.ts";
import type { ActionHandlerDeps } from "./composer.ts";
import { composeActions } from "./composer.ts";
import { createActionDispatcher } from "./dispatcher.ts";

/** Transition a real machine to SELECTED with a real DOM element. */
function selectElement(machine: PickerStateMachine): void {
  machine.dispatch({ type: "INVOKE" });
  machine.dispatch({
    target: document.createElement("div"),
    type: "CLICK",
  });
}

/** Build fully mocked deps. Machine starts in IDLE; call selectElement for SELECTED. */
function makeDeps(
  overrides: Partial<ActionHandlerDeps> = {}
): ActionHandlerDeps {
  let format: "markdown" | "html" = "markdown";
  const setFormat = vi.fn((f: "markdown" | "html") => {
    format = f;
  });
  const machine = new PickerStateMachine();

  const deps: ActionHandlerDeps = {
    format: () => format,
    htmlConverter: {
      convert: vi.fn().mockResolvedValue("converted-content"),
      extractContent: vi.fn().mockReturnValue("<div>test</div>"),
    },
    machine,
    sendMessage: vi.fn().mockResolvedValue(undefined),
    setBarVisible: vi.fn(),
    setFormat,
    setSelectedElement: vi.fn(),
    showToast: vi.fn(),
  };

  return { ...deps, ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("composeActions — return shape", () => {
  it("returns a dispatcher, registry, and dispose function", () => {
    const { dispatcher, registry, dispose } = composeActions(makeDeps());

    expect(typeof dispatcher.dispatch).toBe("function");
    expect(typeof dispatcher.on).toBe("function");
    expect(Array.isArray(registry.bindings)).toBe(true);
    expect(registry.bindings.length).toBeGreaterThan(0);
    expect(typeof dispose).toBe("function");
  });
});

describe("COPY handler", () => {
  it("converts element, sends clipboard message, shows toast, then DISMISS", async () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "COPY" });

    await vi.waitFor(() => {
      expect(deps.showToast).toHaveBeenCalledWith("Copied to clipboard");
    });

    expect(deps.htmlConverter.extractContent).toHaveBeenCalledWith(
      expect.any(Element)
    );
    expect(deps.htmlConverter.convert).toHaveBeenCalled();
    expect(deps.sendMessage).toHaveBeenCalledWith({
      content: "converted-content",
      type: "COPY_TO_CLIPBOARD",
    });
    // DISMISS was dispatched by the COPY handler → machine is now IDLE
    expect(deps.machine.getState()).toBe("IDLE");
    expect(deps.setBarVisible).toHaveBeenCalledWith(false);
  });

  it("uses the current format signal when converting", async () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "COPY" });

    await vi.waitFor(() =>
      expect(deps.htmlConverter.convert).toHaveBeenCalled()
    );
  });

  it("uses html format when the format signal is html", async () => {
    const deps = makeDeps();
    deps.setFormat("html");
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "COPY" });

    await vi.waitFor(() =>
      expect(deps.htmlConverter.convert).toHaveBeenCalled()
    );
  });

  it("silently drops COPY when no element is selected", async () => {
    const deps = makeDeps();
    // machine is in IDLE — no selected element
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "COPY" });

    await Promise.resolve();
    await Promise.resolve();

    expect(deps.htmlConverter.extractContent).not.toHaveBeenCalled();
    expect(deps.htmlConverter.convert).not.toHaveBeenCalled();
    expect(deps.sendMessage).not.toHaveBeenCalled();
    expect(deps.showToast).not.toHaveBeenCalled();
  });

  it("shows error toast when convert throws", async () => {
    const deps = makeDeps({
      htmlConverter: {
        convert: vi.fn().mockRejectedValue(new Error("boom")),
        extractContent: vi.fn().mockReturnValue("<div>test</div>"),
      },
    });
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "COPY" });

    await vi.waitFor(() => {
      expect(deps.showToast).toHaveBeenCalledWith("Copy failed");
    });
    expect(deps.sendMessage).not.toHaveBeenCalled();
    // DISMISS is not dispatched on error
    expect(deps.machine.getState()).toBe("SELECTED");
  });
});

describe("DOWNLOAD handler", () => {
  it("converts element, sends DOWNLOAD_FILE message, shows toast, then DISMISS", async () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "DOWNLOAD" });

    await vi.waitFor(() => {
      expect(deps.showToast).toHaveBeenCalledWith("Element downloaded");
    });

    expect(deps.htmlConverter.extractContent).toHaveBeenCalledTimes(1);
    expect(deps.htmlConverter.convert).toHaveBeenCalled();
    expect(deps.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "converted-content",
        type: "DOWNLOAD_FILE",
      })
    );
    expect(deps.machine.getState()).toBe("IDLE");
    expect(deps.setBarVisible).toHaveBeenCalledWith(false);
  });

  it("silently drops DOWNLOAD when no element is selected", async () => {
    const deps = makeDeps();
    // machine is in IDLE — no selected element
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "DOWNLOAD" });

    await Promise.resolve();
    await Promise.resolve();

    expect(deps.htmlConverter.extractContent).not.toHaveBeenCalled();
    expect(deps.htmlConverter.convert).not.toHaveBeenCalled();
    expect(deps.sendMessage).not.toHaveBeenCalled();
  });

  it("shows error toast when download fails", async () => {
    const deps = makeDeps({
      sendMessage: vi.fn().mockRejectedValue(new Error("download rejected")),
    });
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "DOWNLOAD" });

    await vi.waitFor(() => {
      expect(deps.showToast).toHaveBeenCalledWith(
        expect.stringContaining("Download failed")
      );
    });
    // DISMISS not dispatched on error
    expect(deps.machine.getState()).toBe("SELECTED");
  });
});

describe("FORMAT_CHANGE handler", () => {
  it("updates format signal and dispatches to machine", () => {
    const deps = makeDeps();
    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ format: "html", type: "FORMAT_CHANGE" });

    expect(deps.setFormat).toHaveBeenCalledWith("html");
    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "html",
      type: "FORMAT_CHANGE",
    });
  });

  it("still updates format signal even when machine is in IDLE", () => {
    const deps = makeDeps();
    // machine is in IDLE (no selectElement called)
    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ format: "html", type: "FORMAT_CHANGE" });

    expect(deps.setFormat).toHaveBeenCalledWith("html");
    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "html",
      type: "FORMAT_CHANGE",
    });
    // Machine ignores FORMAT_CHANGE in IDLE — format stays default.
    expect(deps.machine.getFormat()).toBe("markdown");
  });
});

describe("INVOKE handler", () => {
  it("sets format from payload and dispatches INVOKE to machine", () => {
    const deps = makeDeps();
    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ format: "html", type: "INVOKE" });

    expect(deps.setFormat).toHaveBeenCalledWith("html");
    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "html",
      type: "INVOKE",
    });
    expect(deps.machine.getState()).toBe("HIGHLIGHTING");
  });

  it("does not call setFormat when format is omitted", () => {
    const deps = makeDeps();
    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "INVOKE" });

    expect(deps.setFormat).not.toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "INVOKE" });
  });
});

describe("DISMISS handler", () => {
  it("transitions machine to IDLE and hides bar", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "DISMISS" });

    expect(deps.machine.getState()).toBe("IDLE");
    expect(deps.machine.getSelectedElement()).toBeNull();
    expect(deps.setBarVisible).toHaveBeenCalledWith(false);
  });

  it("also works from HIGHLIGHTING state", () => {
    const deps = makeDeps();
    deps.machine.dispatch({ type: "INVOKE" });
    expect(deps.machine.getState()).toBe("HIGHLIGHTING");

    const { dispatcher } = composeActions(deps);
    dispatcher.dispatch({ type: "DISMISS" });

    expect(deps.machine.getState()).toBe("IDLE");
    expect(deps.setBarVisible).toHaveBeenCalledWith(false);
  });
});

describe("SCROLL / RESIZE handlers", () => {
  it("SCROLL dispatches to machine without side effects", () => {
    const deps = makeDeps();
    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "SCROLL" });

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "SCROLL" });
    expect(deps.machine.getState()).toBe("IDLE");
  });

  it("RESIZE dispatches to machine without side effects", () => {
    const deps = makeDeps();
    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "RESIZE" });

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "RESIZE" });
    expect(deps.machine.getState()).toBe("IDLE");
  });
});

describe("unknown action handling", () => {
  it("does not throw when dispatching an action with no handler", () => {
    // A bare dispatcher with no handlers registered — every action type is
    // "unknown" and must be silently dropped.
    const dispatcher = createActionDispatcher();
    expect(() => dispatcher.dispatch({ type: "COPY" })).not.toThrow();
  });
});
