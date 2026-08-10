import type { Accessor, JSX } from "solid-js";
import { FloatingActionBar } from "../components/floating-bar.tsx";
import { ToastProvider, useToast } from "../components/ui/toast.tsx";

/**
 * Props for the ContentApp component.
 *
 * @public
 */
export interface ContentAppProps {
  /** The currently selected DOM element. */
  element: Accessor<Element | null>;
  /** Current output format. */
  format: Accessor<"markdown" | "html">;
  /** Callback when cancel is clicked. */
  onCancel: () => void;
  /** Callback when copy is requested. */
  onCopy: () => void;
  /** Callback when download is requested. */
  onDownload: () => void;
  /** Callback when format changes. */
  onFormatChange: (format: "markdown" | "html") => void;
  /** Called when the toast API is ready. */
  onToastReady: (showToast: (msg: string) => void) => void;
  /** Whether the floating bar is visible. */
  visible: Accessor<boolean>;
}

/**
 * Toast mount helper that exposes the toast API to the parent.
 *
 * @public
 */
export function ToastMount(props: {
  onReady: (api: { showToast: (msg: string) => void }) => void;
}): JSX.Element {
  const toast = useToast();
  props.onReady(toast);
  return null;
}

/**
 * Main content app component that renders the floating action bar
 * inside a Shadow DOM.
 *
 * @public
 */
export function ContentApp(props: ContentAppProps): JSX.Element {
  return (
    <ToastProvider>
      <ToastMount
        // biome-ignore lint/performance/noJsxPropsBind: mounted once in shadow root
        onReady={(api) => {
          props.onToastReady(api.showToast);
        }}
      />
      {props.visible() && props.element() && (
        <FloatingActionBar
          element={props.element}
          format={props.format}
          onCancel={props.onCancel}
          onCopy={props.onCopy}
          onDownload={props.onDownload}
          onFormatChange={props.onFormatChange}
        />
      )}
    </ToastProvider>
  );
}
