import { cva } from "class-variance-authority";
import { For, type JSX, type ParentProps, splitProps } from "solid-js";

import { cn } from "../../lib/cn.ts";

/**
 * A single radio option.
 *
 * @public
 */
export interface RadioOption {
  /** Visible label for the option. */
  label: string;
  /** Value associated with the option. */
  value: string;
}

/**
 * Layout direction of the radio group.
 *
 * - `vertical` — options stacked top to bottom (default)
 * - `horizontal` — options laid out left to right
 *
 * @public
 */
export type RadioOrientation = "horizontal" | "vertical";

/**
 * Props for the {@link RadioGroup} component.
 *
 * @public
 */
export interface RadioGroupProps {
  /** Additional CSS class merged into the root element. */
  class?: string;
  /** Whether the entire group is disabled. */
  disabled?: boolean;
  /** HTML `id` attribute for the group element. */
  id?: string;
  /** Form `name` attribute forwarded to each radio input. */
  name: string;
  /** Callback invoked with the new value when an option is selected. */
  onChange: (value: string) => void;
  /** The available radio options. */
  options: RadioOption[];
  /** Layout direction of the options. */
  orientation?: RadioOrientation;
  /** The currently selected value. */
  value: string;
}

/**
 * CVA variant configuration for the radio group container.
 */
const radioGroupVariants = cva("flex", {
  defaultVariants: { orientation: "vertical" },
  variants: {
    orientation: {
      horizontal: "flex-row gap-4",
      vertical: "flex-col gap-2",
    },
  },
});

/**
 * CVA variant configuration for each radio option.
 *
 * Base includes `relative pl-5` to make room for the `::before` radio
 * indicator defined in options.css. The indicator is positioned absolute
 * inside the padding box.
 */
const radioItemVariants = cva(
  "relative inline-flex cursor-pointer select-none items-center gap-2 rounded-sm border border-transparent py-1.5 pr-2 pl-5 font-sans text-[12px] transition-[color,background-color,border-color] duration-fast ease-out focus-visible:shadow-focus focus-visible:outline-none active:enabled:scale-[0.97]",
  {
    defaultVariants: { selected: false },
    variants: {
      selected: {
        false: "text-text-secondary hover:bg-border/30 hover:text-text",
        true: "border-border-accent bg-accent-dim text-accent",
      },
    },
  }
);

/**
 * Visually hidden native radio input for form semantics and screen readers.
 */
function VisuallyHiddenRadio(props: {
  checked: boolean;
  disabled?: boolean;
  name: string;
  value: string;
}): JSX.Element {
  return (
    <input
      aria-checked={props.checked}
      checked={props.checked}
      disabled={props.disabled}
      name={props.name}
      readOnly
      style={{
        border: "0",
        clip: "rect(0, 0, 0, 0)",
        height: "1px",
        margin: "-1px",
        overflow: "hidden",
        padding: "0",
        position: "absolute",
        "white-space": "nowrap",
        width: "1px",
      }}
      tabIndex={props.checked ? 0 : -1}
      type="radio"
      value={props.value}
    />
  );
}

/**
 * Accessible radio group with roving tabindex and keyboard navigation.
 *
 * Renders a set of radio options inside a `role="radiogroup"` container.
 * The currently selected option has `tabIndex=0`; all others have
 * `tabIndex=-1` (roving tabindex). Arrow keys move focus between options.
 *
 * @public
 */
export function RadioGroup(props: ParentProps<RadioGroupProps>): JSX.Element {
  const [local] = splitProps(props, [
    "class",
    "disabled",
    "id",
    "name",
    "onChange",
    "options",
    "orientation",
    "value",
  ]);

  const orientation = () => local.orientation ?? "vertical";

  const optionRefs: HTMLDivElement[] = [];

  function focusOption(index: number): void {
    const clamped = Math.max(0, Math.min(index, local.options.length - 1));
    optionRefs[clamped]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (local.disabled) {
      return;
    }

    const currentIndex = local.options.findIndex(
      (opt) => opt.value === local.value
    );
    const isVertical = orientation() === "vertical";

    switch (event.key) {
      case "ArrowDown": {
        if (!isVertical) {
          return;
        }
        event.preventDefault();
        focusOption(currentIndex + 1);
        break;
      }
      case "ArrowUp": {
        if (!isVertical) {
          return;
        }
        event.preventDefault();
        focusOption(currentIndex - 1);
        break;
      }
      case "ArrowRight": {
        if (isVertical) {
          return;
        }
        event.preventDefault();
        focusOption(currentIndex + 1);
        break;
      }
      case "ArrowLeft": {
        if (isVertical) {
          return;
        }
        event.preventDefault();
        focusOption(currentIndex - 1);
        break;
      }
      case "Home": {
        event.preventDefault();
        focusOption(0);
        break;
      }
      case "End": {
        event.preventDefault();
        focusOption(local.options.length - 1);
        break;
      }
      default:
        break;
    }
  }

  function handleOptionClick(value: string): void {
    if (!local.disabled) {
      local.onChange(value);
    }
  }

  function setOptionRef(el: HTMLDivElement, index: number): void {
    optionRefs[index] = el;
  }

  return (
    <div
      aria-disabled={local.disabled || undefined}
      aria-orientation={orientation()}
      class={cn(
        radioGroupVariants({ orientation: orientation() }),
        local.class
      )}
      data-tamiz-radio-group
      id={local.id}
      // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
      onKeyDown={handleKeyDown}
      role="radiogroup"
    >
      <For each={local.options}>
        {(option, index) => {
          const isSelected = () => option.value === local.value;
          const optionIndex = index;

          return (
            <div
              aria-checked={isSelected()}
              class={cn(
                radioItemVariants({ selected: isSelected() }),
                local.disabled && "pointer-events-none opacity-[0.35]"
              )}
              data-tamiz-radio-item
              data-value={option.value}
              id={`${local.name}-${option.value}`}
              // biome-ignore lint/performance/noJsxPropsBind: SolidJS For body runs once per item; stable in practice
              onClick={() => handleOptionClick(option.value)}
              // biome-ignore lint/performance/noJsxPropsBind: SolidJS For body runs once per item; stable in practice
              ref={(el) => {
                setOptionRef(el, optionIndex());
              }}
              role="radio"
              tabIndex={isSelected() ? 0 : -1}
            >
              <VisuallyHiddenRadio
                checked={isSelected()}
                disabled={local.disabled}
                name={local.name}
                value={option.value}
              />
              <span aria-hidden="true">{option.label}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
