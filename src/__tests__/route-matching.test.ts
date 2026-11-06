import { describe, expect, it } from "vitest";
import { isComponentWide, isOnPage, placeTrail } from "../utils/route-matching";

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
    const onNavBar = { annotationId: '[data-orbit-component="NavBar"]', pagina: "/", component: "NavBar" };
    expect(isOnPage(onNavBar, "/instellingen", here)).toBe(true);
    expect(isOnPage(onNavBar, "/", none)).toBe(false);
  });
});

describe("isComponentWide", () => {
  const whole = { annotationId: '[data-orbit-component="Tabs"]', component: "Tabs" };

  it("tells the whole component from one instance by its selector", () => {
    expect(isComponentWide(whole)).toBe(true);
    expect(isComponentWide({ annotationId: "#tabs > a", component: "Tabs" })).toBe(false);
    expect(isComponentWide({ annotationId: `${whole.annotationId} > a`, component: "Tabs" })).toBe(false);
    expect(isComponentWide({ annotationId: whole.annotationId })).toBe(false);
  });

  it("keeps an instance on its page, and lets the whole follow the component", () => {
    const onPage = new Set(["Tabs"]);
    const instanceHere = { annotationId: "#tabs > a", component: "Tabs", pagina: "/taken" };
    expect(isOnPage(instanceHere, "/taken", onPage)).toBe(true);
    expect(isOnPage(instanceHere, "/elders", onPage)).toBe(false);
    expect(isOnPage({ ...whole, pagina: "/taken" }, "/elders", onPage)).toBe(true);
  });
});

describe("placeTrail", () => {
  it("names the root and leaves the query out", () => {
    expect(placeTrail("/", "Tabs", "Home")).toBe("Home / Tabs");
    expect(placeTrail("/?metric=comfort&from=2025", "Tabs", "Home")).toBe("Home / Tabs");
  });

  it("keeps the two pages nearest the element", () => {
    expect(placeTrail("/clienten/jan", "<h2> Doelen", "Home")).toBe("clienten / jan / <h2> Doelen");
    expect(placeTrail("/clienten/jan/40.2/doelen", "<h2> Doelen", "Home")).toBe("… / 40.2 / doelen / <h2> Doelen");
  });

  it("does without a page or an element", () => {
    expect(placeTrail(undefined, "<p> Tekst", "Home")).toBe("<p> Tekst");
    expect(placeTrail("/instellingen", "", "Home")).toBe("instellingen");
    expect(placeTrail(undefined, "", "Home")).toBe("");
  });
});
