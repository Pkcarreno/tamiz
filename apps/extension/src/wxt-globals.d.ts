/**
 * WXT auto-imported globals for content scripts.
 *
 * These are provided by WXT at build time and don't need explicit imports.
 */
declare function defineContentScript(definition: {
  main: () => void;
  matches: string[];
}): void;

declare function createShadowRootUi<TMounted>(options: {
  isolateEvents?: string[];
  onMount: (container: HTMLDivElement) => void;
  position?: "overlay" | "inline";
}): { unmount: () => void };
