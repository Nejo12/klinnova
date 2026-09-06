"use client";

import {
  cloneElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import styles from "./popover-menu.module.scss";

export type OverlayAlign = "start" | "end";

type OverlayTriggerProps = {
  id?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-haspopup"?: "dialog" | "menu";
  "data-overlay-trigger"?: string;
};

export type PopoverProps = {
  trigger: ReactElement;
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  align?: OverlayAlign;
  className?: string;
};

export type MenuItem = {
  id: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  shortcut?: ReactNode;
};

export type MenuProps = {
  trigger: ReactElement;
  items: readonly MenuItem[];
  align?: OverlayAlign;
  className?: string;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusTrigger(triggerId: string) {
  document.getElementById(triggerId)?.focus();
}

export function Popover({
  trigger: triggerElement,
  title,
  children,
  action,
  align = "start",
  className,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const generatedTriggerId = useId();
  const panelId = useId();
  const titleId = useId();
  const trigger = triggerElement as ReactElement<OverlayTriggerProps>;
  const triggerId = trigger.props.id ?? generatedTriggerId;
  const classNames = [styles.root, className].filter(Boolean).join(" ");

  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;
    const initialTarget = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (initialTarget ?? panel)?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  function handleTriggerClick(event: MouseEvent<HTMLElement>) {
    trigger.props.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen((current) => !current);
    }
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      focusTrigger(triggerId);
    }
  }

  return (
    <span className={classNames} ref={rootRef}>
      {cloneElement(trigger, {
        id: triggerId,
        onClick: handleTriggerClick,
        "aria-expanded": open,
        "aria-controls": panelId,
        "aria-haspopup": "dialog",
        "data-overlay-trigger": "",
      })}

      {open ? (
        <div
          ref={panelRef}
          className={styles.surface}
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          data-kind="popover"
          data-align={align}
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
        >
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <div className={styles.body}>{children}</div>
          {action !== undefined ? (
            <div className={styles.popoverAction}>{action}</div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

export function Menu({
  trigger: triggerElement,
  items,
  align = "start",
  className,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const generatedTriggerId = useId();
  const panelId = useId();
  const trigger = triggerElement as ReactElement<OverlayTriggerProps>;
  const triggerId = trigger.props.id ?? generatedTriggerId;
  const classNames = [styles.root, className].filter(Boolean).join(" ");
  const enabledIndices = items.flatMap((item, index) =>
    item.disabled ? [] : [index],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    (itemRefs.current[activeIndex] ?? panelRef.current)?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  function openMenu(target: "first" | "last" = "first") {
    const index =
      target === "last" ? enabledIndices.at(-1) : enabledIndices.at(0);
    setActiveIndex(index ?? 0);
    setOpen(true);
  }

  function closeMenu(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) {
      focusTrigger(triggerId);
    }
  }

  function handleTriggerClick(event: MouseEvent<HTMLElement>) {
    trigger.props.onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (open) {
      closeMenu(false);
    } else {
      openMenu();
    }
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLElement>) {
    trigger.props.onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      closeMenu(true);
    }
  }

  function moveActive(direction: 1 | -1) {
    if (enabledIndices.length === 0) {
      return;
    }

    const currentPosition = enabledIndices.indexOf(activeIndex);
    const nextPosition =
      (currentPosition + direction + enabledIndices.length) %
      enabledIndices.length;
    setActiveIndex(enabledIndices[nextPosition] ?? enabledIndices[0] ?? 0);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(enabledIndices[0] ?? 0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(enabledIndices.at(-1) ?? 0);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <span className={classNames} ref={rootRef}>
      {cloneElement(trigger, {
        id: triggerId,
        onClick: handleTriggerClick,
        onKeyDown: handleTriggerKeyDown,
        "aria-expanded": open,
        "aria-controls": panelId,
        "aria-haspopup": "menu",
        "data-overlay-trigger": "",
      })}

      {open ? (
        <div
          ref={panelRef}
          className={styles.surface}
          id={panelId}
          role="menu"
          aria-labelledby={triggerId}
          data-kind="menu"
          data-align={align}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              className={styles.menuItem}
              type="button"
              role="menuitem"
              tabIndex={index === activeIndex ? 0 : -1}
              disabled={item.disabled}
              data-tone={item.tone ?? "default"}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                item.onSelect();
                closeMenu(true);
              }}
            >
              <span>{item.label}</span>
              {item.shortcut !== undefined ? (
                <span className={styles.shortcut} aria-hidden="true">
                  {item.shortcut}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
