import { describe, expect, it } from "vitest";
import { isOnPage } from "../utils/route-matching";

describe("isOnPage", () => {
  it("shows feedback without a page everywhere", () => {
    expect(isOnPage({}, "/instellingen", new Set())).toBe(true);
    expect(isOnPage({ pagina: "" }, "/instellingen", new Set())).toBe(true);
  });

  const none = new Set<string>();

  it("keeps feedback on an element to the page it was given on", () => {
    expect(isOnPage({ pagina: "/" }, "/", none)).toBe(true);
    expect(isOnPage({ pagina: "/" }, "/instellingen", none)).toBe(false);
  });

  it("shows feedback on a component wherever the component is", () => {
    const here = new Set(["NavBar"]);
    expect(isOnPage({ pagina: "/", component: "NavBar" }, "/instellingen", here)).toBe(true);
    expect(isOnPage({ pagina: "/", component: "NavBar" }, "/", none)).toBe(false);
  });
});
