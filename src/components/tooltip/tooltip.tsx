"use client";

import {
  cloneElement,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from "react";

import styles from "./tooltip.module.scss";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  placement?: TooltipPlacement;
  className?: string;
};

type DescribedTriggerProps = {
  "aria-describedby"?: string;
};

type InteractionState = {
  hovered: boolean;
  focused: boolean;
  dismissed: boolean;
};

const INITIAL_INTERACTION: InteractionState = {
  hovered: false,
  focused: false,
  dismissed: false,
};

export function Tooltip({
  content,
  children,
  placement = "top",
  className,
}: TooltipProps) {
  const tooltipId = useId();
  const [interaction, setInteraction] =
    useState<InteractionState>(INITIAL_INTERACTION);
  const open =
    (interaction.hovered || interaction.focused) && !interaction.dismissed;
  const trigger = children as ReactElement<DescribedTriggerProps>;
  const describedBy = [
    trigger.props["aria-describedby"],
    open ? tooltipId : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const classNames = [styles.wrapper, className].filter(Boolean).join(" ");

  function updateInteraction(update: Partial<InteractionState>) {
    setInteraction((current) => ({ ...current, ...update }));
  }

  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    updateInteraction({ focused: false });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      updateInteraction({ dismissed: true });
    }
  }

  return (
    <span
      className={classNames}
      onPointerEnter={() =>
        updateInteraction({ hovered: true, dismissed: false })
      }
      onPointerLeave={() => updateInteraction({ hovered: false })}
      onFocusCapture={() =>
        updateInteraction({ focused: true, dismissed: false })
      }
      onBlurCapture={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {cloneElement(trigger, {
        "aria-describedby": describedBy || undefined,
      })}

      {open ? (
        <span
          className={styles.tooltip}
          id={tooltipId}
          role="tooltip"
          data-placement={placement}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
