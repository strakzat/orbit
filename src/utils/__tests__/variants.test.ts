import { describe, expect, it, vi } from "vitest";
import {
  applyVariant,
  comparableValue,
  describeVariants,
  isChanged,
  parseValue,
  parseVariantLines,
  resetVariant,
  serializeValue,
  splitVariantText,
  threadVariants,
} from "../variants";
import { buildNotionCommentProperties, parseNotionComment } from "../../server";
import type { OrbitVariant } from "../../types";

const labels = { variantsNone: "geen", variantsOn: "aan", variantsOff: "uit" };

const rol: OrbitVariant = {
  type: "choice",
  id: "rol",
  title: "Rol",
  options: [
    { id: "regie", label: "Regiebehandelaar" },
    { id: "admin", label: "Administratie" },
  ],
  value: "admin",
  defaultValue: "regie",
  onChange: () => {},
};

describe("variants", () => {
  it("reads a link's value back in the default's type", () => {
    for (const [value, fallback] of [
      [true, false],
      [false, true],
      [42, 0],
      ["admin", "regie"],
      [["a", "b"], []],
      [[], ["a"]],
    ] as const) {
      expect(parseValue(serializeValue(value), fallback)).toEqual(value);
    }
    expect(parseValue("abc", 3)).toBe(3);
    // A boolean that does not read keeps its default rather than turning off.
    expect(parseValue("yes", true)).toBe(true);
  });

  it("compares a list of ids in any order as the same list", () => {
    expect(comparableValue(["b", "a"])).toBe(comparableValue(["a", "b"]));
    expect(serializeValue(["b", "a"])).toBe("b,a");
  });

  it("is changed only off a default it has", () => {
    expect(isChanged(rol)).toBe(true);
    expect(isChanged({ ...rol, defaultValue: undefined })).toBe(false);
    expect(
      isChanged({ type: "multi", id: "m", title: "M", options: [], value: ["b", "a"], defaultValue: ["a", "b"], onChange: () => {} })
    ).toBe(false);
    expect(isChanged({ type: "action", id: "a", title: "A", onRun: () => {} })).toBe(false);
  });

  it("puts a changed variant back", () => {
    const onChange = vi.fn();
    resetVariant({ ...rol, onChange });
    expect(onChange).toHaveBeenCalledWith("regie");
  });

  it("describes the variants on this route, this page's first, without actions", () => {
    const variants: OrbitVariant[] = [
      rol,
      { type: "switch", id: "s", title: "Leeg", value: true, onChange: () => {}, pages: (r) => r === "/taken" },
      { type: "range", id: "n", title: "Berichten", min: 0, max: 9, value: 3, onChange: () => {}, format: (n) => `${n} stuks` },
      { type: "multi", id: "m", title: "Modules", options: [{ id: "a", label: "A" }], value: [], onChange: () => {} },
      { type: "action", id: "a", title: "Toast", onRun: () => {} },
      { type: "switch", id: "o", title: "Elders", value: true, onChange: () => {}, pages: (r) => r === "/elders" },
    ];
    expect(describeVariants(variants, "/taken", labels).replace(/ \(orbit\..*\)/g, "")).toBe(
      "Leeg: aan\nRol: Administratie\nBerichten: 3 stuks\nModules: geen"
    );
  });

  describe("on a comment", () => {
    const choice = (over: object = {}) =>
      ({
        type: "choice",
        id: "rol",
        title: "Rol",
        options: [
          { id: "regie", label: "Regie" },
          { id: "admin", label: "Admin (kantoor)" },
          { id: "oud", label: "Oud", disabled: true },
        ],
        value: "regie",
        defaultValue: "regie",
        onChange: vi.fn(),
        ...over,
      }) as Extract<OrbitVariant, { type: "choice" }>;

    it("writes the id behind the text, and only for what has a default", () => {
      const variants: OrbitVariant[] = [
        choice({ value: "admin" }),
        { type: "switch", id: "demo", title: "Demo", value: false, defaultValue: false, onChange: () => {} },
        { type: "switch", id: "pins", title: "Pins", value: true, onChange: () => {} },
      ];
      expect(describeVariants(variants, "/", labels)).toBe(
        "Rol: Admin (kantoor) (orbit.rol=admin, changed)\nDemo: uit (orbit.demo=0)\nPins: aan"
      );
    });

    it("reads its lines back", () => {
      const written = describeVariants([choice({ value: "admin" })], "/", labels);
      expect(parseVariantLines(`${written}\nThema: Systeem (donker)`)).toEqual([
        { text: "Rol: Admin (kantoor)", id: "rol", raw: "admin", changed: true },
        { text: "Thema: Systeem (donker)", changed: false },
      ]);
      expect(parseVariantLines(undefined)).toEqual([]);
    });

    it("splits a line's text at its first colon", () => {
      expect(splitVariantText("Canvas en kaart: F: Glas")).toEqual({ title: "Canvas en kaart", value: "F: Glas" });
      expect(splitVariantText("Los")).toEqual({ title: "Los", value: "" });
    });

    it("keeps a list of ids and an empty list", () => {
      expect(parseVariantLines("M: A, B (orbit.m=a,b)")[0].raw).toBe("a,b");
      expect(parseVariantLines("M: geen (orbit.m=)")[0].raw).toBe("");
    });

    it("takes a thread's variants from its oldest comment that has any", () => {
      const comments = [
        { annotationId: "x", aangemaakt: "2026-03-01", varianten: "R: B (orbit.rol=b)" },
        { annotationId: "x", aangemaakt: "2026-02-01", varianten: "R: A (orbit.rol=a)\nT: Licht" },
        { annotationId: "x", aangemaakt: "2026-01-01" },
        { annotationId: "x", aangemaakt: "2026-01-02", varianten: "T: Licht" },
        { annotationId: "y", aangemaakt: "2025-01-01", varianten: "R: C (orbit.rol=c)" },
      ];
      expect(threadVariants(comments, "x")).toEqual(new Map([["rol", "a"]]));
      expect(threadVariants(comments, "z").size).toBe(0);
    });

    it("applies what the variant can still take", () => {
      const variant = choice();
      expect(applyVariant(variant, "admin")).toBe(true);
      expect(variant.onChange).toHaveBeenCalledWith("admin");
    });

    it("leaves a choice on the same value, a gone option and a disabled one", () => {
      const variant = choice();
      expect(applyVariant(variant, "regie")).toBe(false);
      expect(applyVariant(variant, "weg")).toBe(false);
      expect(applyVariant(variant, "oud")).toBe(false);
      expect(variant.onChange).not.toHaveBeenCalled();
    });

    it("drops ids a multi no longer has, in any order the same list", () => {
      const onChange = vi.fn();
      const base = { type: "multi", id: "m", title: "M", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], onChange } as const;
      expect(applyVariant({ ...base, value: ["a"] }, "b,weg")).toBe(true);
      expect(onChange).toHaveBeenCalledWith(["b"]);
      onChange.mockClear();
      expect(applyVariant({ ...base, value: ["a", "b"] }, "b,a")).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("reads a switch and keeps a range within its bounds", () => {
      const onSwitch = vi.fn();
      const on = { type: "switch", id: "s", title: "S", value: false, onChange: onSwitch } as const;
      expect(applyVariant(on, "1")).toBe(true);
      expect(onSwitch).toHaveBeenCalledWith(true);
      expect(applyVariant(on, "onzin")).toBe(false);

      const onRange = vi.fn();
      const range = { type: "range", id: "r", title: "R", min: 0, max: 9, value: 3, onChange: onRange } as const;
      expect(applyVariant(range, "12")).toBe(false);
      expect(applyVariant(range, "7")).toBe(true);
      expect(onRange).toHaveBeenCalledWith(7);
    });

    it("never runs an action", () => {
      const onRun = vi.fn();
      expect(applyVariant({ type: "action", id: "a", title: "A", onRun }, "1")).toBe(false);
      expect(onRun).not.toHaveBeenCalled();
    });
  });

  it("writes Varianten to Notion only when there are any, and reads it back", () => {
    const base = { annotationId: "x", comment: "c" };
    expect(buildNotionCommentProperties(base, "p")).not.toHaveProperty("Varianten");
    const properties = buildNotionCommentProperties({ ...base, varianten: "Rol: Administratie" }, "p");
    expect(properties.Varianten).toEqual({ rich_text: [{ text: { content: "Rol: Administratie" } }] });
    const page = { id: "1", properties: { Varianten: { rich_text: [{ plain_text: "Rol: Administratie" }] } } };
    expect(parseNotionComment(page).varianten).toBe("Rol: Administratie");
    expect(parseNotionComment({ id: "2", properties: {} }).varianten).toBeUndefined();
  });
});
