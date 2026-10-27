import { describe, expect, it, vi } from "vitest";
import { comparableValue, describeVariants, isChanged, parseValue, resetVariant, serializeValue } from "../variants";
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
    expect(describeVariants(variants, "/taken", labels)).toBe(
      "Leeg: aan\nRol: Administratie\nBerichten: 3 stuks\nModules: geen"
    );
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
