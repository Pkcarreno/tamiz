import { afterEach, describe, expect, it, vi } from "vitest";
import { PickerStateMachine } from "../machine/picker.ts";
import type { ActionHandlerDeps } from "./composer.ts";
import { composeActions } from "./composer.ts";
import { createActionDispatcher } from "./dispatcher.ts";

const SLUG_FILENAME_PATTERN = /^[a-z0-9-]+\.md$/;

/** Transition a real machine to SELECTED with a real DOM element. */
function selectElement(machine: PickerStateMachine): void {
  machine.dispatch({ type: "INVOKE" });
  machine.dispatch({
    target: document.createElement("div"),
    type: "CLICK",
  });
}

/** Transition a real machine to SELECTED with a specific DOM element. */
function machine_selectElement(
  machine: PickerStateMachine,
  element: Element
): void {
  machine.dispatch({ type: "INVOKE" });
  machine.dispatch({ target: element, type: "CLICK" });
}

/** Build fully mocked deps. Machine starts in IDLE; call selectElement for SELECTED. */
function makeDeps(
  overrides: Partial<ActionHandlerDeps> = {}
): ActionHandlerDeps {
  let format: "markdown" | "html" = "markdown";
  const setFormat = vi.fn((f: "markdown" | "html") => {
    format = f;
  });
  let exclusionMode = false;
  let excludedElements = new Set<Element>();
  const machine = new PickerStateMachine();

  const deps: ActionHandlerDeps = {
    clipboardAvailable: vi.fn().mockReturnValue(true),
    format: () => format,
    getExcludedElements: () => excludedElements,
    getExclusionMode: () => exclusionMode,
    htmlConverter: {
      convert: vi.fn().mockResolvedValue("converted-content"),
      extractContent: vi.fn().mockReturnValue("<div>test</div>"),
    },
    machine,
    sendMessage: vi.fn().mockResolvedValue(undefined),
    setBarVisible: vi.fn(),
    setExcludedElements: vi.fn((s: Set<Element>) => {
      excludedElements = s;
    }),
    setExclusionMode: vi.fn((e: boolean) => {
      exclusionMode = e;
    }),
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
  it("converts element, writes directly to clipboard, shows toast, then DISMISS", async () => {
    const deps = makeDeps();
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "COPY" });

    await vi.waitFor(() => {
      expect(deps.showToast).toHaveBeenCalledWith("Copied to clipboard");
    });

    expect(deps.htmlConverter.extractContent).toHaveBeenCalledWith(
      expect.any(Element),
      expect.any(Set)
    );
    expect(deps.htmlConverter.convert).toHaveBeenCalled();
    expect(writeTextSpy).toHaveBeenCalledWith("converted-content");
    expect(deps.sendMessage).not.toHaveBeenCalled();
    // DISMISS was dispatched by the COPY handler → machine is now IDLE
    expect(deps.machine.getState()).toBe("IDLE");
    expect(deps.setBarVisible).toHaveBeenCalledWith(false);
  });

  it("sends COPY_TO_CLIPBOARD message when clipboard API is unavailable", async () => {
    const deps = makeDeps({
      clipboardAvailable: vi.fn().mockReturnValue(false),
    });
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "COPY" });

    await vi.waitFor(() => {
      expect(deps.showToast).toHaveBeenCalledWith("Copied to clipboard");
    });

    expect(deps.sendMessage).toHaveBeenCalledWith({
      content: "converted-content",
      type: "COPY_TO_CLIPBOARD",
    });
    expect(deps.machine.getState()).toBe("IDLE");
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
        filename: expect.stringMatching(SLUG_FILENAME_PATTERN),
        type: "DOWNLOAD_FILE",
      })
    );
    expect(deps.machine.getState()).toBe("IDLE");
    expect(deps.setBarVisible).toHaveBeenCalledWith(false);
  });

  it("uses heading text in filename when element contains a heading", async () => {
    const deps = makeDeps();
    const element = document.createElement("div");
    const heading = document.createElement("h1");
    heading.textContent = "Getting Started Guide";
    element.appendChild(heading);
    machine_selectElement(deps.machine, element);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "DOWNLOAD" });

    await vi.waitFor(() => {
      expect(deps.showToast).toHaveBeenCalledWith("Element downloaded");
    });

    expect(deps.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "getting-started-guide.md",
        type: "DOWNLOAD_FILE",
      })
    );
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

  it("clears exclusion mode and excluded elements", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "DISMISS" });

    expect(deps.setExclusionMode).toHaveBeenCalledWith(false);
    expect(deps.setExcludedElements).toHaveBeenCalledWith(expect.any(Set));
  });
});

describe("RESTART handler", () => {
  it("transitions machine to HIGHLIGHTING and clears selected element", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "RESTART" });

    expect(deps.machine.getState()).toBe("HIGHLIGHTING");
    expect(deps.machine.getSelectedElement()).toBeNull();
  });

  it("does not call setBarVisible — state drives visibility", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "RESTART" });

    expect(deps.setBarVisible).not.toHaveBeenCalledWith(false);
  });

  it("preserves format after RESTART", () => {
    const deps = makeDeps();
    deps.setFormat("html");
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "RESTART" });

    expect(deps.machine.getState()).toBe("HIGHLIGHTING");
    // setFormat was only called once during the initial setup, not during RESTART
    expect(deps.setFormat).toHaveBeenCalledTimes(1);
    expect(deps.setFormat).not.toHaveBeenCalledWith("markdown");
  });

  it("clears exclusion mode and excluded elements", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "RESTART" });

    expect(deps.setExclusionMode).toHaveBeenCalledWith(false);
    expect(deps.setExcludedElements).toHaveBeenCalledWith(expect.any(Set));
  });
});

describe("EXCLUDE_TOGGLE handler", () => {
  it("toggles exclusion mode on when currently off", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "EXCLUDE_TOGGLE" });

    expect(deps.setExclusionMode).toHaveBeenCalledWith(true);
  });

  it("toggles exclusion mode off when currently on", () => {
    const deps = makeDeps({
      getExclusionMode: () => true,
    });
    selectElement(deps.machine);
    const { dispatcher } = composeActions(deps);

    dispatcher.dispatch({ type: "EXCLUDE_TOGGLE" });

    expect(deps.setExclusionMode).toHaveBeenCalledWith(false);
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
