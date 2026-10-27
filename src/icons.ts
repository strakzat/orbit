import React from "react";

export interface IconProps {
  size?: number;
  /**
   * Rendered stroke width in CSS pixels. The `strokeWidth` attribute is scaled by
   * the icon's size so the stroke stays optically identical at every size — one
   * stroke weight per icon set, which is what keeps a row of icons looking like
   * one family. 1.5px matches text at 400–600.
   */
  strokeWidthPx?: number;
}

type Shape = [tag: string, attrs: Record<string, unknown>];

const VIEWBOX = 24;

/**
 * Every icon in this package is decorative: the button or label around it carries
 * the accessible name. So they are all `aria-hidden` and out of the tab order.
 */
function createIcon(shapes: Shape[]) {
  return function Icon({ size = 16, strokeWidthPx = 1.5 }: IconProps) {
    return React.createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: `0 0 ${VIEWBOX} ${VIEWBOX}`,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: (VIEWBOX / size) * strokeWidthPx,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
        focusable: "false",
      },
      ...shapes.map(([tag, attrs], index) =>
        React.createElement(tag, { key: index, ...attrs })
      )
    );
  };
}

export const MessageSquareTextIcon = createIcon([
  ["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }],
  ["path", { d: "M13 8H7" }],
  ["path", { d: "M17 12H7" }],
]);

export const MapPinIcon = createIcon([
  ["path", { d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" }],
  ["circle", { cx: 12, cy: 10, r: 3 }],
]);

export const XIcon = createIcon([
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }],
]);

export const SearchIcon = createIcon([
  ["circle", { cx: 11, cy: 11, r: 8 }],
  ["path", { d: "m21 21-4.3-4.3" }],
]);

export const GripVerticalIcon = createIcon([
  ["circle", { cx: 9, cy: 12, r: 1 }],
  ["circle", { cx: 9, cy: 5, r: 1 }],
  ["circle", { cx: 9, cy: 19, r: 1 }],
  ["circle", { cx: 15, cy: 12, r: 1 }],
  ["circle", { cx: 15, cy: 5, r: 1 }],
  ["circle", { cx: 15, cy: 19, r: 1 }],
]);

export const AlertCircleIcon = createIcon([
  ["circle", { cx: 12, cy: 12, r: 10 }],
  ["path", { d: "M12 8v4" }],
  ["path", { d: "M12 16h.01" }],
]);

export const CrosshairIcon = createIcon([
  ["circle", { cx: 12, cy: 12, r: 10 }],
  ["line", { x1: 22, y1: 12, x2: 18, y2: 12 }],
  ["line", { x1: 6, y1: 12, x2: 2, y2: 12 }],
  ["line", { x1: 12, y1: 6, x2: 12, y2: 2 }],
  ["line", { x1: 12, y1: 22, x2: 12, y2: 18 }],
]);

export const ChevronRightIcon = createIcon([["path", { d: "m9 18 6-6-6-6" }]]);

// ── Annotation type icons ──

export const FileTextIcon = createIcon([
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ["path", { d: "M10 13H8" }],
  ["path", { d: "M16 17H8" }],
  ["path", { d: "M16 13h-2" }],
]);

export const ThumbsUpIcon = createIcon([
  ["path", { d: "M7 10v12" }],
  [
    "path",
    {
      d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
    },
  ],
]);

export const HelpCircleIcon = createIcon([
  ["circle", { cx: 12, cy: 12, r: 10 }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }],
  ["path", { d: "M12 17h.01" }],
]);

export const ThumbsDownIcon = createIcon([
  ["path", { d: "M17 14V2" }],
  [
    "path",
    {
      d: "M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",
    },
  ],
]);

export const SparklesIcon = createIcon([
  [
    "path",
    {
      d: "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z",
    },
  ],
]);

export const AlertTriangleIcon = createIcon([
  ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }],
  ["path", { d: "M12 9v4" }],
  ["path", { d: "M12 17h.01" }],
]);

export const EyeIcon = createIcon([
  ["path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }],
  ["circle", { cx: 12, cy: 12, r: 3 }],
]);

// The rail's icons, from Untitled UI (MIT), as Radial's site uses them.

/** settings-04: the variants pane. */
export const SlidersIcon = createIcon([
  ["path", { d: "M3 8h12m0 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm-6 8h12M9 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" }],
]);

/** message-plus-square: place feedback, the inspector. */
export const MessagePlusSquareIcon = createIcon([
  ["path", { d: "M12 13.5v-6m-3 3h6M7 18v2.335c0 .533 0 .8.11.937a.5.5 0 0 0 .39.188c.176 0 .384-.167.8-.5l2.385-1.908c.487-.39.731-.585 1.002-.724.241-.122.497-.212.762-.267.299-.061.61-.061 1.235-.061H16.2c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 15.72 21 14.88 21 13.2V7.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C18.72 3 17.88 3 16.2 3H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 5.28 3 6.12 3 7.8V14c0 .93 0 1.395.102 1.777a3 3 0 0 0 2.122 2.12C5.605 18 6.07 18 7 18Z" }],
]);

/** message-chat-square: annotations and feedback, the panel. */
export const MessageChatSquareIcon = createIcon([
  ["path", { d: "m10 15-3.075 3.114c-.43.434-.644.651-.828.666a.5.5 0 0 1-.421-.172c-.12-.14-.12-.446-.12-1.056v-1.56c0-.548-.449-.944-.99-1.024v0a3 3 0 0 1-2.534-2.533C2 12.219 2 11.96 2 11.445V6.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C4.28 2 5.12 2 6.8 2h7.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C19 4.28 19 5.12 19 6.8V11m0 11-2.176-1.513c-.306-.213-.46-.32-.626-.395a2.002 2.002 0 0 0-.462-.145c-.18-.033-.367-.033-.74-.033H13.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C10 18.394 10 17.834 10 16.714V14.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C11.52 11 12.08 11 13.2 11h5.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C22 12.52 22 13.08 22 14.2v2.714c0 .932 0 1.398-.152 1.766a2 2 0 0 1-1.083 1.082c-.367.152-.833.152-1.765.152V22Z" }],
]);

/** user-01: the profile, before there is a name for its monogram. */
export const UserIcon = createIcon([
  ["path", { d: "M20 21c0-1.396 0-2.093-.172-2.661a4 4 0 0 0-2.667-2.667C16.593 15.5 15.896 15.5 14.5 15.5h-5c-1.396 0-2.093 0-2.661.172a4 4 0 0 0-2.667 2.667C4 18.907 4 19.604 4 21M16.5 7.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" }],
]);

/** chevron-down: a select's arrow. */
export const ChevronDownIcon = createIcon([["path", { d: "m6 9 6 6 6-6" }]]);

/** check: a ticked checkbox, a copied link. */
export const CheckIcon = createIcon([["path", { d: "M20 6 9 17l-5-5" }]]);

/** refresh-ccw-01: back to the defaults. */
export const RefreshIcon = createIcon([
  ["path", { d: "M2 10s2.005-2.732 3.634-4.362A9 9 0 1 1 3.36 14.5M2 10V4m0 6h6" }],
]);

/** link-01: a link to the prototype in its variants. */
export const LinkIcon = createIcon([
  ["path", { d: "m12.708 18.364-1.415 1.414a5 5 0 1 1-7.07-7.07l1.413-1.415m12.728 1.414 1.415-1.414a5 5 0 0 0-7.071-7.071l-1.415 1.414M8.5 15.5l7-7" }],
]);
