import React, { useEffect, useRef } from "react";
import { useAnnotations } from "../context/use-annotations";
import { ORBIT_UI_ATTR } from "../constants";
import { useStableId } from "../utils/use-stable-id";
import type { OrbitChoiceVariant, OrbitSwitchVariant, OrbitVariant } from "../types";

/** Deze pagina, what changes the current route, and Overal; the empty ones left out. */
export function variantGroups(
  variants: OrbitVariant[],
  route: string,
  labels: { variantsThisPage: string; variantsEverywhere: string }
) {
  return [
    { name: labels.variantsThisPage, items: variants.filter((v) => v.pages?.(route)) },
    { name: labels.variantsEverywhere, items: variants.filter((v) => !v.pages) },
  ].filter((group) => group.items.length > 0);
}

interface VariantsPaneProps {
  id: string;
  variants: OrbitVariant[];
  onClose: (returnFocus: boolean) => void;
  /** Said by the rail's live region once a variant changed. */
  onAnnounce: (text: string) => void;
}

/**
 * One choice: its options side by side on Radial's pill, the current one on the chip. A radio
 * group: Tab reaches the current option, the arrow keys move and choose, as a radio group does.
 */
function Choice({ variant, onAnnounce }: { variant: OrbitChoiceVariant; onAnnounce: (text: string) => void }) {
  const titleId = useStableId("orbit-variant");
  const groupRef = useRef<HTMLDivElement>(null);

  const choose = (index: number) => {
    const option = variant.options[index];
    if (!option || option.id === variant.value) return;
    variant.onChange(option.id);
    onAnnounce(`${variant.title}: ${option.label}.`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = variant.options.findIndex((option) => option.id === variant.value);
    const last = variant.options.length - 1;
    const to =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? at >= last ? 0 : at + 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? at <= 0 ? last : at - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (to < 0) return;
    e.preventDefault();
    choose(to);
    groupRef.current?.querySelectorAll<HTMLElement>("[role=radio]")[to]?.focus();
  };

  return React.createElement(
    "div",
    { className: "orbit-variants__choice" },
    React.createElement("span", { id: titleId, className: "orbit-variants__title" }, variant.title),
    React.createElement(
      "div",
      {
        ref: groupRef,
        role: "radiogroup",
        "aria-labelledby": titleId,
        className: "orbit-segments",
        onKeyDown,
      },
      ...variant.options.map((option, index) => {
        const checked = option.id === variant.value;
        return React.createElement(
          "button",
          {
            key: option.id,
            type: "button",
            role: "radio",
            "aria-checked": checked,
            tabIndex: checked ? 0 : -1,
            className: "orbit-segment",
            onClick: () => choose(index),
          },
          option.label
        );
      })
    )
  );
}

/** On or off: the title, and Radial's switch beside it, near-white when on. */
function Switch({ variant, onAnnounce }: { variant: OrbitSwitchVariant; onAnnounce: (text: string) => void }) {
  return React.createElement(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": variant.value,
      className: "orbit-switch",
      onClick: () => {
        variant.onChange(!variant.value);
        onAnnounce(`${variant.title}: ${variant.value ? "uit" : "aan"}.`);
      },
    },
    variant.title,
    React.createElement(
      "span",
      { className: "orbit-switch__track", "aria-hidden": true },
      React.createElement("span", { className: "orbit-switch__knob" })
    )
  );
}

/**
 * The project's variants, over the foot of the window on the rail's left, as high as the panel on
 * its right. Under "Deze pagina" what changes the current route (`pages`); under "Overal" the rest.
 * A non-modal dialog: it opens with the focus on its first control, Escape closes it and gives the
 * focus back to the rail, and a press outside it closes it.
 */
export function VariantsPane({ id, variants, onClose, onAnnounce }: VariantsPaneProps) {
  const { labels, settings, currentRoute } = useAnnotations();
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    paneRef.current
      ?.querySelector<HTMLElement>('[role=radio][aria-checked="true"], [role=switch]')
      ?.focus();

    // Only its own Escape: one in the project's dialog, or for the inspector, is theirs.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const active = document.activeElement as HTMLElement | null;
      if (paneRef.current?.contains(active) || active?.closest("[data-orbit-variants-toggle]")) onClose(true);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // The rail's own button toggles the pane itself.
      if (paneRef.current?.contains(target) || target.closest("[data-orbit-variants-toggle]")) return;
      onClose(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose]);

  const groups = variantGroups(variants, currentRoute, labels);

  return React.createElement(
    "div",
    {
      ref: paneRef,
      id,
      role: "dialog",
      "aria-label": labels.variants,
      [ORBIT_UI_ATTR]: "",
      className: "orbit-root orbit-variants orbit-glass-pane orbit-animate-in",
      // As high as the panel on the other side.
      style: { height: settings.panelHeight },
    },
    ...groups.map((group) =>
      React.createElement(
        "section",
        { key: group.name, className: "orbit-variants__group" },
        React.createElement("h2", { className: "orbit-variants__heading" }, group.name),
        ...group.items.map((variant) =>
          variant.type === "choice"
            ? React.createElement(Choice, { key: variant.id, variant, onAnnounce })
            : React.createElement(Switch, { key: variant.id, variant, onAnnounce })
        )
      )
    )
  );
}
