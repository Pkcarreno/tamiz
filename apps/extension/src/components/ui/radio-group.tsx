import { cva } from "class-variance-authority";
import { type JSX, type ParentProps, splitProps } from "solid-js";

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
  /** Callback invoked with the new value when an option is selected. */
  onChange: (value: string) => void;
  /** Form `name` attribute forwarded to each radio input. */
  name: string;
  /** Layout direction of the options. */
  orientation?: RadioOrientation;
  /** The available radio options. */
  options: RadioOption[];
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
 */
const radioItemVariants = cva(
  "inline-flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 font-sans text-[12px] transition-[color,background-color] duration-fast ease-out select-none focus-visible:shadow-focus focus-visible:outline-none",
  {
    defaultVariants: { selected: false },
    variants: {
      selected: {
        false: "text-text-secondary hover:text-text",
        true: "bg-accent-dim text-accent",
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
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        "white-space": "nowrap",
        border: "0",
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
 * `tabIndex=-1` (roving tabindex). Arrow keys move focus between options,
 * and Enter/Space selects the focused option.
 *
 * @public
 */
export function RadioGroup(props: ParentProps<RadioGroupProps>): JSX.Element {
  const [local, rest] = splitProps(props, [
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

  let groupRef: HTMLDivElement | undefined;
  let optionRefs: HTMLDivElement[] = [];

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

  return (
    <div
      ref={groupRef}
      aria-disabled={local.disabled || undefined}
      aria-orientation={orientation()}
      class={cn(radioGroupVariants({ orientation: orientation() }), local.class)}
      data-tamiz-radio-group
      id={local.id}
      // biome-ignore lint/a11y/useSemanticElements: roving tabindex radiogroup
      role="radiogroup"
      onKeyDown={handleKeyDown}
    >
      {local.options.map((option, index) => {
        const isSelected = () => option.value === local.value;
        const optionIndex = index;

        return (
          <div
            ref={(el) => {
              optionRefs[optionIndex] = el;
            }}
            aria-checked={isSelected()}
            class={cn(
              radioItemVariants({ selected: isSelected() }),
              local.disabled && "pointer-events-none opacity-[0.35]"
            )}
            data-tamiz-radio-item
            data-value={option.value}
            id={`${local.name}-${option.value}`}
            role="radio"
            tabIndex={isSelected() ? 0 : -1}
            onClick={() => handleOptionClick(option.value)}
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
      })}
    </div>
  );
}
