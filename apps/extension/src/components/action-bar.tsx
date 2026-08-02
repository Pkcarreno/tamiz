import { createSignal } from "solid-js";

/**
 * Props for the ActionBar component.
 *
 * @public
 */
export interface ActionBarProps {
  /** Callback when copy is requested */
  onCopy: () => void;
  /** Callback when dismiss is requested */
  onDismiss: () => void;
  /** Callback when download is requested */
  onDownload: () => void;
  /** Callback when format changes */
  onFormatChange: (format: "markdown" | "raw") => void;
}

/**
 * Action bar component for format selection and copy/download.
 *
 * @public
 */
export function ActionBar(props: ActionBarProps) {
  const [format, setFormat] = createSignal<"markdown" | "raw">("markdown");

  const handleFormatChange = (newFormat: "markdown" | "raw") => {
    setFormat(newFormat);
    props.onFormatChange(newFormat);
  };

  return (
    <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
      {/* Format selector */}
      <div class="flex overflow-hidden rounded-md border border-gray-300">
        <button
          class={`px-3 py-1 text-sm ${
            format() === "markdown"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          onClick={[handleFormatChange, "markdown"]}
          type="button"
        >
          Markdown
        </button>
        <button
          class={`px-3 py-1 text-sm ${
            format() === "raw"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          onClick={[handleFormatChange, "raw"]}
          type="button"
        >
          Raw HTML
        </button>
      </div>

      {/* Action buttons */}
      <button
        class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
        onClick={props.onCopy}
        type="button"
      >
        Copy
      </button>
      <button
        class="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
        onClick={props.onDownload}
        type="button"
      >
        Download
      </button>
      <button
        class="rounded bg-gray-200 px-3 py-1 text-gray-700 text-sm hover:bg-gray-300"
        onClick={props.onDismiss}
        type="button"
      >
        Close
      </button>
    </div>
  );
}
