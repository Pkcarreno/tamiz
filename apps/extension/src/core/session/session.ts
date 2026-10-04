import {
  buildFilename,
  extractArticleName,
  extractTwitterTitle,
  type FilenameSource,
} from "../../lib/build-filename.ts";
import { isClipboardAvailable } from "../../lib/feature-detection.ts";
import {
  createHighlightController,
  type HighlightController,
} from "../highlight.ts";
import {
  createShortcutRegistry,
  type ShortcutRegistry,
} from "../keyboard/registry.ts";
import { isSelectable } from "../picker-filter.ts";
import { createScrimController, type ScrimController } from "../scrim.ts";
import type {
  OutputFormat,
  PickerAction,
  PickerSessionDeps,
  PickerSessionSnapshot,
  PickerSessionState,
} from "./types.ts";

/** File extension for each output format. */
const FORMAT_EXTENSION: Record<OutputFormat, string> = {
  html: "html",
  markdown: "md",
};

/**
 * Deep session controller for element selection, exclusion management,
 * and format conversion.
 *
 * Consolidates lifecycle transitions, action execution, and reactive
 * snapshot broadcasting into a single cohesive domain module.
 *
 * @public
 */
export class PickerSession {
  private readonly deps: PickerSessionDeps;
  private readonly listeners = new Set<
    (snapshot: PickerSessionSnapshot) => void
  >();

  private state: PickerSessionState = "IDLE";
  private selectedElement: Element | null = null;
  private format: OutputFormat = "markdown";
  private isExclusionMode = false;
  private readonly excludedElements = new Set<Element>();

  /** Shortcut registry for resolving keyboard shortcuts and tooltip labels. */
  readonly registry: ShortcutRegistry;
  /** Controller managing element highlights and hover states. */
  readonly highlight: HighlightController;
  /** Controller managing background scrim overlay. */
  readonly scrim: ScrimController;

  constructor(deps: PickerSessionDeps) {
    this.deps = deps;
    this.registry = deps.registry ?? createShortcutRegistry();
    this.highlight = deps.highlight ?? createHighlightController();
    this.scrim = deps.scrim ?? createScrimController();
  }

  /**
   * Get an immutable snapshot of current session state.
   */
  getSnapshot(): PickerSessionSnapshot {
    return {
      excludedElements: new Set(this.excludedElements),
      format: this.format,
      isExclusionMode: this.isExclusionMode,
      selectedElement: this.selectedElement,
      state: this.state,
    };
  }

  /**
   * Subscribe a listener to atomic state snapshot updates.
   *
   * @param listener - Callback receiving the new snapshot on mutation.
   * @returns Cleanup function that removes the listener.
   */
  subscribe(listener: (snapshot: PickerSessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispatch an action to mutate session state or trigger side effects.
   *
   * @param action - The action intent to process.
   */
  async dispatch(action: PickerAction): Promise<void> {
    switch (action.type) {
      case "INVOKE":
        this.handleInvoke(action.format);
        break;
      case "HOVER":
        this.handleHover(action.target);
        break;
      case "SELECT":
        this.handleSelect(action.target);
        break;
      case "EXCLUDE_TOGGLE":
        this.handleExcludeToggle();
        break;
      case "TOGGLE_EXCLUSION_ELEMENT":
        this.handleToggleExclusionElement(action.target);
        break;
      case "FORMAT_CHANGE":
        this.handleFormatChange(action.format);
        break;
      case "RESTART":
        this.handleRestart();
        break;
      case "DISMISS":
        this.handleDismiss();
        break;
      case "COPY":
        await this.handleCopy();
        break;
      case "DOWNLOAD":
        await this.handleDownload();
        break;
      case "OPEN_OPTIONS":
        await this.handleOpenOptions();
        break;
      default:
        break;
    }
  }

  private emitSnapshot(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private clearExcludedClasses(): void {
    const doc =
      this.deps.documentRef ??
      (typeof document === "undefined" ? null : document);
    if (!doc) {
      return;
    }
    for (const el of doc.querySelectorAll(".tamiz-excluded")) {
      el.classList.remove("tamiz-excluded");
    }
  }

  private handleInvoke(format?: OutputFormat): void {
    if (format !== undefined) {
      this.format = format;
    }
    this.state = "HIGHLIGHTING";
    this.selectedElement = null;
    this.isExclusionMode = false;
    this.excludedElements.clear();

    this.highlight.clearAll();
    this.clearExcludedClasses();
    this.scrim.show();
    this.emitSnapshot();
  }

  private handleHover(target: Element | null): void {
    if (this.state !== "HIGHLIGHTING") {
      return;
    }
    this.highlight.setHoverTarget(target);
  }

  private handleSelect(target: Element): void {
    if (this.state !== "HIGHLIGHTING") {
      return;
    }
    this.state = "SELECTED";
    this.selectedElement = target;
    this.highlight.selectElement(target);
    this.emitSnapshot();
  }

  private isInExclusionMode(): boolean {
    return this.isExclusionMode;
  }

  private handleExcludeToggle(): void {
    if (this.state !== "SELECTED") {
      return;
    }
    this.isExclusionMode = !this.isExclusionMode;
    this.emitSnapshot();
  }

  private handleToggleExclusionElement(target: Element): void {
    if (
      this.state !== "SELECTED" ||
      !this.isExclusionMode ||
      !this.selectedElement
    ) {
      return;
    }

    const doc =
      this.deps.documentRef ??
      (typeof document === "undefined" ? null : document);

    // Only allow excluding child elements contained inside selectedElement.
    if (
      target === this.selectedElement ||
      (doc && target === doc.documentElement) ||
      !isSelectable(target) ||
      !this.selectedElement.contains(target)
    ) {
      return;
    }

    if (this.excludedElements.has(target)) {
      this.excludedElements.delete(target);
      target.classList.remove("tamiz-excluded");
    } else {
      this.excludedElements.add(target);
      target.classList.add("tamiz-excluded");
    }

    this.isExclusionMode = false;
    this.emitSnapshot();
  }

  private handleFormatChange(format: OutputFormat): void {
    this.format = format;
    this.emitSnapshot();
  }

  private handleRestart(): void {
    if (this.isInExclusionMode()) {
      return;
    }
    this.state = "HIGHLIGHTING";
    this.selectedElement = null;
    this.isExclusionMode = false;
    this.excludedElements.clear();

    this.highlight.clearAll();
    this.clearExcludedClasses();
    this.scrim.show();
    this.emitSnapshot();
  }

  private handleDismiss(): void {
    this.state = "IDLE";
    this.selectedElement = null;
    this.isExclusionMode = false;
    this.excludedElements.clear();

    this.highlight.clearAll();
    this.clearExcludedClasses();
    this.scrim.hide();
    this.emitSnapshot();
  }

  private async handleCopy(): Promise<void> {
    if (
      this.isInExclusionMode() ||
      this.state !== "SELECTED" ||
      !this.selectedElement
    ) {
      return;
    }

    try {
      const cleanElement = this.deps.htmlConverter.extractContent(
        this.selectedElement,
        this.excludedElements
      );
      const content = await this.deps.htmlConverter.convert(cleanElement, {
        format: this.format,
      });

      const hasClipboard =
        this.deps.clipboardAvailable?.() ?? isClipboardAvailable();

      if (hasClipboard) {
        if (this.deps.writeClipboard) {
          await this.deps.writeClipboard(content);
        } else if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(content);
        } else {
          await this.deps.sendMessage({ content, type: "COPY_TO_CLIPBOARD" });
        }
      } else {
        await this.deps.sendMessage({ content, type: "COPY_TO_CLIPBOARD" });
      }

      this.deps.showToast?.("Copied to clipboard");
      await this.dispatch({ type: "DISMISS" });
    } catch {
      this.deps.showToast?.("Copy failed");
    }
  }

  private async handleDownload(): Promise<void> {
    if (
      this.isInExclusionMode() ||
      this.state !== "SELECTED" ||
      !this.selectedElement
    ) {
      return;
    }

    try {
      const cleanElement = this.deps.htmlConverter.extractContent(
        this.selectedElement,
        this.excludedElements
      );
      const content = await this.deps.htmlConverter.convert(cleanElement, {
        format: this.format,
      });

      const extension = FORMAT_EXTENSION[this.format];
      const doc =
        this.deps.documentRef ??
        (typeof document === "undefined" ? null : document);

      const source: FilenameSource = {
        articleName: doc ? (extractArticleName(doc) ?? undefined) : undefined,
        element: this.selectedElement,
        pageTitle: doc?.title ?? "",
        twitterTitle: doc ? (extractTwitterTitle(doc) ?? undefined) : undefined,
      };

      const filename = buildFilename(source, extension);
      await this.deps.sendMessage({ content, filename, type: "DOWNLOAD_FILE" });
      this.deps.showToast?.("Element downloaded");
      await this.dispatch({ type: "DISMISS" });
    } catch (err) {
      this.deps.showToast?.(
        `Download failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  private async handleOpenOptions(): Promise<void> {
    try {
      await this.deps.sendMessage({ type: "OPEN_OPTIONS" });
    } catch {
      // Silently ignore background failure
    }
    await this.dispatch({ type: "DISMISS" });
  }
}

/**
 * Factory function creating a fully configured {@link PickerSession}.
 *
 * @param deps - Runtime adapters and collaborators.
 * @returns Ready-to-use PickerSession instance.
 *
 * @public
 */
export function createPickerSession(deps: PickerSessionDeps): PickerSession {
  return new PickerSession(deps);
}
