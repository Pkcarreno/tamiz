import { For } from "solid-js";

/**
 * A single option in the Select component.
 *
 * @public
 */
export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Available sizes for the Select component.
 *
 * @public
 */
export type SelectSize = "sm" | "md";

/**
 * Props for the {@link Select} component.
 *
 * @public
 */
export interface SelectProps {
  /** Additional CSS class for the container. */
  class?: string;
  /** HTML id attribute for the container. */
  id?: string;
  /** Callback invoked with the new value when an option is selected. */
  onChange: (value: string) => void;
  /** The available options to choose from. */
  options: SelectOption[];
  /** Size of the option buttons. @default "md" */
  size?: SelectSize;
  /** The currently selected value. */
  value: string;
}

/**
 * Toggle-group selector that renders a set of connected buttons.
 *
 * The active option is highlighted with the primary color. All colors and
 * spacing reference Tamiz design tokens defined in `content.css`.
 *
 * @public
 */
export function Select(props: SelectProps) {
  return (
    <div
      class={`tz-select tz-select-${props.size ?? "md"} ${props.class ?? ""}`.trim()}
      id={props.id}
    >
      <For each={props.options}>
        {(option) => (
          <button
            class={
              props.value === option.value
                ? "tz-select-option tz-select-option--active"
                : "tz-select-option"
            }
            onClick={[props.onChange, option.value]}
            type="button"
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}
