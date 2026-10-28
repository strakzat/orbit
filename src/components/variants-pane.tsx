import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAnnotations } from "../context/use-annotations";
import { ORBIT_UI_ATTR } from "../constants";
import { CheckIcon, ChevronDownIcon, LinkIcon, RefreshIcon, XIcon } from "../icons";
import { hasLinkedVariants, variantLink } from "../hooks/use-variant";
import { cx } from "../utils/cx";
import { useStableId } from "../utils/use-stable-id";
import { formatRange, isChanged, resetVariant, variantScopes, variantsHere } from "../utils/variants";
import type {
  OrbitActionVariant,
  OrbitChoiceDisplay,
  OrbitChoiceVariant,
  OrbitMultiVariant,
  OrbitRangeVariant,
  OrbitSwitchVariant,
  OrbitVariant,
} from "../types";

/** From this many options a choice is a select: a list that long no longer reads at a glance. */
const SELECT_FROM = 7;

type Announce = (text: string) => void;

/** The title over a control, and its hint under the title; the ids wire both to the control. */
function Field({
  titleId,
  hintId,
  variant,
  aside,
  children,
}: {
  titleId: string;
  hintId: string;
  variant: OrbitVariant;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return React.createElement(
    "div",
    { className: "orbit-variants__field" },
    React.createElement(
      "div",
      { className: "orbit-variants__label" },
      React.createElement("span", { id: titleId, className: "orbit-variants__title" }, variant.title),
      aside
    ),
    variant.hint
      ? React.createElement("p", { id: hintId, className: "orbit-variants__hint" }, variant.hint)
      : null,
    children
  );
}

/**
 * Whether the options fit side by side, each on an equal share of the pill. Measured, not
 * counted: three short options fit, two long ones may not. A copy of the pill, out of sight and
 * as wide as its widest option times their number, is held against the width there is.
 */
function useSegmentsFit(measure: boolean) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);

  // Before the first paint, so a choice that does not fit never shows as a pill.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    const probe = probeRef.current;
    if (!measure || !field || !probe) return;
    const check = () => setFits(probe.offsetWidth <= field.clientWidth);
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(field);
    observer.observe(probe);
    return () => observer.disconnect();
  }, [measure]);

  return { fieldRef, probeRef, fits };
}

/** The display a choice gets: the one it asks for, or the one its options call for. */
function useChoiceDisplay(variant: OrbitChoiceVariant) {
  const auto = !variant.display && variant.options.length < SELECT_FROM;
  const { fieldRef, probeRef, fits } = useSegmentsFit(auto);
  const display: OrbitChoiceDisplay =
    variant.display ?? (variant.options.length >= SELECT_FROM ? "select" : fits ? "segments" : "radios");

  // The pill as it would be, every option in the chip's weight, in a box of no size.
  const probe = auto
    ? React.createElement(
        "div",
        { className: "orbit-probe", "aria-hidden": true },
        React.createElement(
          "div",
          { ref: probeRef, className: "orbit-segments orbit-segments--probe" },
          ...variant.options.map((option) =>
            React.createElement("span", { key: option.id, className: "orbit-segment" }, option.label)
          )
        )
      )
    : null;

  return { display, fieldRef, probe };
}

/**
 * One choice. On Radial's pill, the options side by side and the current one on the chip, while
 * they fit; as a list of radios when one does not; as a select when there are many. Whichever it
 * is, it is a radio group to the keyboard and to a screen reader, or a select.
 */
export function Choice({ variant, onAnnounce }: { variant: OrbitChoiceVariant; onAnnounce: Announce }) {
  const titleId = useStableId("orbit-variant");
  const hintId = useStableId("orbit-variant-hint");
  const { display, fieldRef, probe } = useChoiceDisplay(variant);

  const choose = (id: string) => {
    const option = variant.options.find((o) => o.id === id);
    if (!option || option.disabled || option.id === variant.value) return;
    variant.onChange(option.id);
    onAnnounce(`${variant.title}: ${option.label}.`);
  };

  const describedBy = variant.hint ? hintId : undefined;
  const control =
    display === "select"
      ? React.createElement(Select, { variant, titleId, describedBy, choose })
      : display === "radios"
        ? React.createElement(Radios, { variant, titleId, describedBy, choose })
        : React.createElement(Segments, { variant, titleId, describedBy, choose });

  return React.createElement(
    "div",
    { ref: fieldRef, className: "orbit-variants__measure" },
    React.createElement(Field, { titleId, hintId, variant }, control),
    probe
  );
}

interface ChoiceControlProps {
  variant: OrbitChoiceVariant;
  titleId: string;
  describedBy: string | undefined;
  choose: (id: string) => void;
}

/** Radial's pill. Tab reaches the current option, the arrow keys move and choose, skipping a disabled one. */
function Segments({ variant, titleId, describedBy, choose }: ChoiceControlProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const options = variant.options;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    if (!enabled.length) return;
    const at = enabled.indexOf(options.findIndex((o) => o.id === variant.value));
    const last = enabled.length - 1;
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? at >= last ? 0 : at + 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? at <= 0 ? last : at - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (step < 0) return;
    e.preventDefault();
    const to = enabled[step];
    choose(options[to].id);
    groupRef.current?.querySelectorAll<HTMLElement>("[role=radio]")[to]?.focus();
  };

  // With no option current, the first one that can be picked takes the tab stop.
  const current = options.findIndex((o) => o.id === variant.value && !o.disabled);
  const tabStop = current >= 0 ? current : options.findIndex((o) => !o.disabled);

  return React.createElement(
    "div",
    {
      ref: groupRef,
      role: "radiogroup",
      "aria-labelledby": titleId,
      "aria-describedby": describedBy,
      className: "orbit-segments",
      onKeyDown,
    },
    ...options.map((option, index) =>
      React.createElement(
        "button",
        {
          key: option.id,
          type: "button",
          role: "radio",
          "aria-checked": option.id === variant.value,
          "aria-disabled": option.disabled || undefined,
          tabIndex: index === tabStop ? 0 : -1,
          className: "orbit-segment",
          onClick: () => choose(option.id),
        },
        option.label
      )
    )
  );
}

/** A list, one option a row: native radios, so the arrow keys and the group come from the browser. */
function Radios({ variant, titleId, describedBy, choose }: ChoiceControlProps) {
  const name = useStableId("orbit-radios");
  return React.createElement(
    "div",
    { role: "radiogroup", "aria-labelledby": titleId, "aria-describedby": describedBy, className: "orbit-options" },
    ...variant.options.map((option) =>
      React.createElement(Option, {
        key: option.id,
        kind: "radio",
        name,
        label: option.label,
        checked: option.id === variant.value,
        disabled: option.disabled,
        onChange: () => choose(option.id),
      })
    )
  );
}

/** A native select in Radial's field: the browser's own list, so it works wherever it is opened. */
function Select({ variant, titleId, describedBy, choose }: ChoiceControlProps) {
  const known = variant.options.some((o) => o.id === variant.value);
  return React.createElement(
    "div",
    { className: "orbit-select" },
    React.createElement(
      "select",
      {
        className: "orbit-input orbit-select__field",
        value: variant.value,
        "aria-labelledby": titleId,
        "aria-describedby": describedBy,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => choose(e.target.value),
      },
      // A value none of the options has still shows, rather than the first option posing as it.
      known ? null : React.createElement("option", { key: "", value: variant.value, disabled: true }, variant.value),
      ...variant.options.map((option) =>
        React.createElement("option", { key: option.id, value: option.id, disabled: option.disabled }, option.label)
      )
    ),
    React.createElement(
      "span",
      { className: "orbit-select__chevron" },
      React.createElement(ChevronDownIcon, { size: 16 })
    )
  );
}

/** A radio or a checkbox in Radial's look: the native input over its mark, the label beside it. */
function Option({
  kind,
  name,
  label,
  checked,
  disabled,
  onChange,
}: {
  kind: "radio" | "checkbox";
  name?: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return React.createElement(
    "label",
    { className: cx("orbit-option", disabled && "orbit-option--disabled") },
    React.createElement(
      "span",
      { className: cx("orbit-option__mark", `orbit-option__mark--${kind}`) },
      React.createElement("input", {
        type: kind,
        name,
        checked,
        disabled,
        className: "orbit-option__input",
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked),
      }),
      kind === "checkbox"
        ? React.createElement(
            "span",
            { className: "orbit-option__check" },
            React.createElement(CheckIcon, { size: 12, strokeWidthPx: 2 })
          )
        : React.createElement("span", { className: "orbit-option__dot" })
    ),
    React.createElement("span", { className: "orbit-option__label" }, label)
  );
}

/** Any number of options at once: a checkbox each. */
function Multi({ variant, onAnnounce }: { variant: OrbitMultiVariant; onAnnounce: Announce }) {
  const { labels } = useAnnotations();
  const titleId = useStableId("orbit-variant");
  const hintId = useStableId("orbit-variant-hint");
  const toggle = (id: string, on: boolean) => {
    const option = variant.options.find((o) => o.id === id);
    if (!option) return;
    // In the options' own order, whatever order they were ticked in.
    const next = variant.options.filter((o) => (o.id === id ? on : variant.value.includes(o.id))).map((o) => o.id);
    variant.onChange(next);
    onAnnounce(`${variant.title}: ${option.label} ${on ? labels.variantsOn : labels.variantsOff}.`);
  };
  return React.createElement(
    Field,
    { titleId, hintId, variant },
    React.createElement(
      "div",
      {
        role: "group",
        "aria-labelledby": titleId,
        "aria-describedby": variant.hint ? hintId : undefined,
        className: "orbit-options",
      },
      ...variant.options.map((option) =>
        React.createElement(Option, {
          key: option.id,
          kind: "checkbox",
          label: option.label,
          checked: variant.value.includes(option.id),
          disabled: option.disabled,
          onChange: (on) => toggle(option.id, on),
        })
      )
    )
  );
}

/** On or off: the title, and Radial's switch beside it, near-white when on. For one thing alone. */
function Switch({ variant, onAnnounce }: { variant: OrbitSwitchVariant; onAnnounce: Announce }) {
  const { labels } = useAnnotations();
  const hintId = useStableId("orbit-variant-hint");
  return React.createElement(
    "div",
    { className: "orbit-variants__field" },
    React.createElement(
      "button",
      {
        type: "button",
        role: "switch",
        "aria-checked": variant.value,
        "aria-describedby": variant.hint ? hintId : undefined,
        className: "orbit-switch",
        onClick: () => {
          variant.onChange(!variant.value);
          onAnnounce(`${variant.title}: ${variant.value ? labels.variantsOff : labels.variantsOn}.`);
        },
      },
      variant.title,
      React.createElement(
        "span",
        { className: "orbit-switch__track", "aria-hidden": true },
        React.createElement("span", { className: "orbit-switch__knob" })
      )
    ),
    variant.hint
      ? React.createElement("p", { id: hintId, className: "orbit-variants__hint orbit-variants__hint--switch" }, variant.hint)
      : null
  );
}

/** A number on Radial's slider, its value read beside the title. A screen reader reads the slider itself. */
function Range({ variant }: { variant: OrbitRangeVariant }) {
  const titleId = useStableId("orbit-variant");
  const hintId = useStableId("orbit-variant-hint");
  const inputId = useStableId("orbit-range");
  const text = formatRange(variant.value, variant.format);
  const span = variant.max - variant.min;
  const progress = span > 0 ? ((variant.value - variant.min) / span) * 100 : 0;

  return React.createElement(
    Field,
    {
      titleId,
      hintId,
      variant,
      aside: React.createElement("output", { htmlFor: inputId, className: "orbit-range__value" }, text),
    },
    React.createElement("input", {
      id: inputId,
      type: "range",
      min: variant.min,
      max: variant.max,
      step: variant.step ?? 1,
      value: variant.value,
      "aria-labelledby": titleId,
      "aria-describedby": variant.hint ? hintId : undefined,
      "aria-valuetext": text,
      className: "orbit-range",
      // The filled part of the track: a measurement of the value, so inline.
      style: { "--orbit-range-progress": `${Math.min(100, Math.max(0, progress))}%` } as React.CSSProperties,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => variant.onChange(Number(e.target.value)),
    })
  );
}

/** Something the prototype does: Radial's secondary button, held while what it runs is running. */
function Action({ variant }: { variant: OrbitActionVariant }) {
  const titleId = useStableId("orbit-variant");
  const hintId = useStableId("orbit-variant-hint");
  const [running, setRunning] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const run = async () => {
    setRunning(true);
    try {
      await variant.onRun();
    } finally {
      if (mounted.current) setRunning(false);
    }
  };

  const button = React.createElement(
    "button",
    {
      type: "button",
      className: "orbit-action",
      disabled: running,
      "aria-busy": running || undefined,
      "aria-describedby": variant.hint ? hintId : undefined,
      onClick: run,
    },
    variant.label ?? variant.title
  );

  // With its own label the title stands over it, as over any field; without, the button is all.
  if (variant.label) return React.createElement(Field, { titleId, hintId, variant }, button);
  return React.createElement(
    "div",
    { className: "orbit-variants__field" },
    button,
    variant.hint ? React.createElement("p", { id: hintId, className: "orbit-variants__hint" }, variant.hint) : null
  );
}

function Variant({ variant, onAnnounce }: { variant: OrbitVariant; onAnnounce: Announce }) {
  switch (variant.type) {
    case "choice":
      return React.createElement(Choice, { variant, onAnnounce });
    case "multi":
      return React.createElement(Multi, { variant, onAnnounce });
    case "switch":
      return React.createElement(Switch, { variant, onAnnounce });
    case "range":
      return React.createElement(Range, { variant });
    case "action":
      return React.createElement(Action, { variant });
  }
}

/**
 * Copies, through the clipboard API where the page may, and the old way where it may not (http).
 * The old way selects a field of its own, so the focus goes back where it was after.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const returnTo = document.activeElement as HTMLElement | null;
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.className = "orbit-sr-only";
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand("copy");
    field.remove();
    returnTo?.focus();
    return done;
  }
}

/** Under the variants: back to the defaults, and a link to the prototype as it stands. */
function Footer({ variants, onAnnounce }: { variants: OrbitVariant[]; onAnnounce: Announce }) {
  const { labels, currentRoute } = useAnnotations();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const here = variantsHere(variants, currentRoute);
  const resettable = here.some((v) => v.type !== "action" && v.defaultValue !== undefined);
  const changed = here.filter(isChanged);
  const linkable = hasLinkedVariants();
  if (!resettable && !linkable) return null;

  return React.createElement(
    "div",
    { className: "orbit-variants__footer" },
    resettable
      ? React.createElement(
          "button",
          {
            type: "button",
            className: "orbit-variants__footer-button",
            disabled: changed.length === 0,
            onClick: () => {
              changed.forEach(resetVariant);
              onAnnounce(`${labels.variantsReset}.`);
            },
          },
          React.createElement(RefreshIcon, { size: 16 }),
          labels.variantsReset
        )
      : null,
    linkable
      ? React.createElement(
          "button",
          {
            type: "button",
            className: "orbit-variants__footer-button",
            onClick: async () => {
              if (!(await copyText(variantLink(variants)))) return;
              setCopied(true);
              onAnnounce(labels.variantsLinkCopied);
            },
          },
          React.createElement(copied ? CheckIcon : LinkIcon, { size: 16 }),
          copied ? labels.variantsLinkCopied.replace(/\.$/, "") : labels.variantsCopyLink
        )
      : null
  );
}

interface VariantsPaneProps {
  id: string;
  variants: OrbitVariant[];
  onClose: (returnFocus: boolean) => void;
  /** Said by the rail's live region once a variant changed. */
  onAnnounce: Announce;
}

/** The first control in the pane, as the focus lands on it: a group's current option, not its first. */
const FIRST_CONTROL = [
  '[role=radio][aria-checked="true"]',
  "input[type=radio]:checked",
  "input[type=checkbox]:not(:disabled)",
  "input[type=range]",
  "select",
  "[role=switch]",
  ".orbit-action:not(:disabled)",
].join(", ");

type Scope = "page" | "all";

/**
 * The project's variants, over the foot of the window on the rail's left, as high and as wide as
 * the panel on its right. A title and its close, then two tabs as the panel has them: "Deze
 * pagina", what changes the current route (`pages`), and "Alle pagina's", the rest, each with a
 * line on what it holds. It opens on this page's when there are any. With nothing to switch on
 * this page, only a line that says so. A non-modal dialog: it opens
 * with the focus on its first control, Escape closes it and gives the focus back to the rail, and a
 * press outside it closes it.
 */
export function VariantsPane({ id, variants, onClose, onAnnounce }: VariantsPaneProps) {
  const { labels, settings, currentRoute, language } = useAnnotations();
  const paneRef = useRef<HTMLDivElement>(null);
  const titleId = useStableId("orbit-variants-title");

  const { page: pageItems, all: allItems } = variantScopes(variants, currentRoute);
  // Nothing on this page and nothing for every page: no tabs to choose between, no footer.
  const nothingHere = pageItems.length + allItems.length === 0;
  const [scope, setScope] = useState<Scope>(() => (pageItems.length > 0 ? "page" : "all"));
  // On another page, the tab it opens on again: this page's when it has any.
  const hasPageItems = pageItems.length > 0;
  const routeRef = useRef(currentRoute);
  useEffect(() => {
    if (routeRef.current === currentRoute) return;
    routeRef.current = currentRoute;
    setScope(hasPageItems ? "page" : "all");
  }, [currentRoute, hasPageItems]);

  useEffect(() => {
    // With no control, the close: the focus is in the dialog either way.
    (
      paneRef.current?.querySelector<HTMLElement>(FIRST_CONTROL) ??
      paneRef.current?.querySelector<HTMLElement>(".orbit-icon-button")
    )?.focus();

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

  const tabs = [
    { key: "page" as const, label: labels.variantsThisPage, hint: labels.variantsThisPageHint, items: pageItems },
    { key: "all" as const, label: labels.variantsEverywhere, hint: labels.variantsEverywhereHint, items: allItems },
  ];
  const shown = tabs.find((t) => t.key === scope)!;

  const header = React.createElement(
    "div",
    { className: "orbit-variants__header" },
    React.createElement("h2", { id: titleId, className: "orbit-variants__heading" }, labels.variants),
    React.createElement(
      "button",
      {
        type: "button",
        className: "orbit-icon-button",
        "aria-label": labels.variantsClose,
        onClick: () => onClose(true),
      },
      React.createElement(XIcon, { size: 16 })
    )
  );

  // Toggle buttons, as the panel's: a tablist would promise arrow keys between them.
  const tabRow = React.createElement(
    "div",
    { className: "orbit-subtabs orbit-variants__tabs" },
    ...tabs.map((t) =>
      React.createElement(
        "button",
        {
          key: t.key,
          type: "button",
          className: cx("orbit-subtab", scope === t.key && "orbit-subtab--active"),
          "aria-pressed": scope === t.key,
          onClick: () => setScope(t.key),
        },
        t.label,
        React.createElement("span", { className: "orbit-subtab__count" }, t.items.length)
      )
    )
  );

  return React.createElement(
    "div",
    {
      ref: paneRef,
      id,
      role: "dialog",
      "aria-labelledby": titleId,
      [ORBIT_UI_ATTR]: "",
      lang: language,
      className: "orbit-root orbit-variants orbit-glass-pane orbit-animate-in",
      // As high and as wide as the panel on the other side; only as high as its line when empty.
      style: { width: settings.panelWidth, height: nothingHere ? undefined : settings.panelHeight },
    },
    header,
    nothingHere ? null : tabRow,
    React.createElement(
      "div",
      { className: "orbit-variants__body" },
      nothingHere ? null : React.createElement("p", { className: "orbit-variants__intro" }, shown.hint),
      shown.items.length > 0
        ? React.createElement(
            "div",
            { className: "orbit-variants__list" },
            ...shown.items.map((variant) => React.createElement(Variant, { key: variant.id, variant, onAnnounce }))
          )
        : React.createElement("p", { className: "orbit-variants__empty" }, labels.variantsEmpty)
    ),
    nothingHere ? null : React.createElement(Footer, { variants, onAnnounce })
  );
}
