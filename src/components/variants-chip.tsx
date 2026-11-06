import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersIcon } from "../icons";
import { cx } from "../utils/cx";
import { splitVariantText } from "../utils/variants";
import { useStableId } from "../utils/use-stable-id";

// The chip to its tooltip, and the tooltip to the edge of the window.
const GAP = 4;
const EDGE = 8;

interface VariantsChipProps {
  label: string;
  /** The variants off their default, as they read. */
  lines: string[];
  /** The card's own action: the chip lies over the card's button, and a click still opens. */
  onSelect?: (e: React.MouseEvent<HTMLElement>) => void;
}

/**
 * That a comment was written in other variants, and in a tooltip which. The tooltip goes to
 * `document.body`, as a thread does, and is only there while it shows: inside the list it was cut
 * off by the panel and pushed the list's scroll height around. A short wait on hover, at once for
 * the keyboard, like the scope's tooltips.
 */
export function VariantsChip({ label, lines, onSelect }: VariantsChipProps) {
  const [open, setOpen] = useState<"hover" | "focus" | null>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const descriptionId = useStableId("orbit-variants-chip");

  // Under the chip, and above it without the room: measured before it paints.
  useLayoutEffect(() => {
    if (!open || !chipRef.current || !tipRef.current) return setPlace(null);
    const chip = chipRef.current.getBoundingClientRect();
    const { width, height } = tipRef.current.getBoundingClientRect();
    const below = chip.bottom + GAP + height + EDGE <= window.innerHeight;
    setPlace({
      left: Math.max(EDGE, Math.min(chip.left, window.innerWidth - width - EDGE)),
      top: below ? chip.bottom + GAP : Math.max(EDGE, chip.top - GAP - height),
    });
  }, [open]);

  // It stays where it was measured, so it goes when the chip moves.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return React.createElement(
    "div",
    { className: "orbit-comment__variants" },
    React.createElement(
      "button",
      {
        ref: chipRef,
        type: "button",
        className: "orbit-comment__variants-chip",
        "aria-describedby": descriptionId,
        // The click may take the card out of view, without the mouse ever leaving the chip.
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          setOpen(null);
          onSelect?.(e);
        },
        onMouseEnter: () => setOpen((now) => now ?? "hover"),
        onMouseLeave: () => setOpen((now) => (now === "hover" ? null : now)),
        onFocus: (e: React.FocusEvent<HTMLElement>) => {
          if (e.currentTarget.matches(":focus-visible")) setOpen("focus");
        },
        onBlur: () => setOpen(null),
        // Escape closes the innermost first: the tooltip, not the thread around it.
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key !== "Escape" || !open) return;
          e.stopPropagation();
          setOpen(null);
        },
      },
      React.createElement(SlidersIcon, { size: 12 }),
      label
    ),
    React.createElement("span", { id: descriptionId, className: "orbit-sr-only" }, lines.join(", ")),
    open &&
      createPortal(
        React.createElement(
          "div",
          {
            ref: tipRef,
            "aria-hidden": true,
            className: cx(
              "orbit-root",
              "orbit-variants-tip",
              place && "orbit-variants-tip--placed",
              open === "focus" && "orbit-variants-tip--now"
            ),
            style: place ?? undefined,
          },
          lines.map((line) => {
            const { title, value } = splitVariantText(line);
            return React.createElement(
              React.Fragment,
              { key: line },
              React.createElement("span", { className: "orbit-variants-tip__value" }, value),
              React.createElement("span", { className: "orbit-variants-tip__title" }, title)
            );
          })
        ),
        document.body
      )
  );
}
