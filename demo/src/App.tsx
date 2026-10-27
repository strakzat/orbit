import React, { useState, useEffect } from "react";
import {
  AnnotationProvider,
  AnnotationMarker,
  OrbitShell,
  useAnnotations,
  useOrbitLanguage,
  useVariant,
  type OrbitVariant,
} from "@strakzat/orbit";
import { annotations } from "./annotations";

// ── Simple client-side router ───────────────────────────────────────────────

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    setRoute(path);
  };

  return { route, navigate };
}

// ── Shared components ───────────────────────────────────────────────────────

function DashboardCard({
  id,
  title,
  value,
  subtitle,
  color,
}: {
  id?: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div
      id={id}
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
        flex: 1,
        minWidth: 200,
      }}
    >
      <p style={{ fontSize: 13, color: "#667085", marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: "#98a2b3" }}>{subtitle}</p>
    </div>
  );
}

function NavBar({ route, navigate }: { route: string; navigate: (p: string) => void }) {
  const links = [
    { path: "/", label: "Dashboard" },
    { path: "/instellingen", label: "Instellingen" },
  ];

  return (
    <nav
      id="main-nav"
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 32,
        borderBottom: "1px solid #e5e7eb",
        paddingBottom: 12,
      }}
    >
      {links.map((l) => (
        <button
          key={l.path}
          onClick={() => navigate(l.path)}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            background: route === l.path ? "#EFF8FF" : "transparent",
            color: route === l.path ? "#175CD3" : "#667085",
            fontWeight: route === l.path ? 600 : 400,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {l.label}
        </button>
      ))}
    </nav>
  );
}

// ── Pages ───────────────────────────────────────────────────────────────────

function DashboardPage() {
  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Dashboard
      </h1>
      <p style={{ color: "#667085", marginBottom: 32 }}>
        Demo van Orbit — @strakzat/orbit
      </p>

      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 40,
        }}
      >
        <AnnotationMarker annotationId="2" position="top-right">
          <DashboardCard
            id="card-omzet"
            title="Omzet"
            value="€ 24.500"
            subtitle="+12% vs vorige maand"
            color="#067647"
          />
        </AnnotationMarker>

        <AnnotationMarker annotationId="3" position="top-right">
          <DashboardCard
            id="card-orders"
            title="Orders"
            value="142"
            subtitle="Target: 150"
            color="#175CD3"
          />
        </AnnotationMarker>

        <AnnotationMarker annotationId="4" position="top-right">
          <DashboardCard
            id="card-acties"
            title="Openstaande acties"
            value="7"
            subtitle="3 urgent"
            color="#B54708"
          />
        </AnnotationMarker>
      </div>

      <div
        id="activiteit"
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Recente activiteit
        </h2>
        {["Order #1042 afgerond", "Nieuw bericht van klant", "Factuur verstuurd"].map(
          (item, i) => (
            <div
              key={i}
              style={{
                padding: "12px 0",
                borderBottom: i < 2 ? "1px solid #f2f4f7" : "none",
                fontSize: 14,
                color: "#344054",
              }}
            >
              {item}
            </div>
          )
        )}
      </div>
    </>
  );
}

function InstellingenPage() {
  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Instellingen
      </h1>
      <p style={{ color: "#667085", marginBottom: 32 }}>
        Beheer je account en voorkeuren
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <AnnotationMarker annotationId="8" position="top-right">
          <div
            id="profiel-sectie"
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              Profiel
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Naam", value: "Jasper den Ouden" },
                { label: "E-mail", value: "jasper@voorbeeld.nl" },
                { label: "Rol", value: "Beheerder" },
              ].map((field) => (
                <div key={field.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f2f4f7" }}>
                  <span style={{ fontSize: 13, color: "#667085" }}>{field.label}</span>
                  <span style={{ fontSize: 13, color: "#344054", fontWeight: 500 }}>{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        </AnnotationMarker>

        <AnnotationMarker annotationId="9" position="top-right">
          <div
            id="notificaties-sectie"
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              Notificaties
            </h2>
            {[
              { label: "E-mail notificaties", enabled: true },
              { label: "Push notificaties", enabled: false },
              { label: "Wekelijkse samenvatting", enabled: true },
            ].map((setting) => (
              <div key={setting.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f2f4f7" }}>
                <span style={{ fontSize: 13, color: "#344054" }}>{setting.label}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: setting.enabled ? "#ECFDF3" : "#F2F4F7",
                  color: setting.enabled ? "#067647" : "#667085",
                }}>
                  {setting.enabled ? "Aan" : "Uit"}
                </span>
              </div>
            ))}
          </div>
        </AnnotationMarker>
      </div>
    </>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const { route, navigate } = useRoute();

  return (
    <AnnotationProvider
      annotations={annotations}
      currentRoute={route}
      comments={{
        enabled: true,
        apiBase: "",
        project: "demo-dashboard",
      }}
    >
      <Shell>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px", background: "#fff", minHeight: "100%" }}>
          <NavBar route={route} navigate={navigate} />
          {route === "/instellingen" ? <InstellingenPage /> : <DashboardPage />}
        </div>
      </Shell>
    </AnnotationProvider>
  );
}

/**
 * The demo's own variants: one of each kind, so every control shows. The first ones are kept by
 * Orbit (`useVariant`), so "Link kopiëren" carries them; the others are plain state. Dichtheid
 * follows the language picked in the rail's profile (`useOrbitLanguage`); the rest is in Dutch.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const [chart, setChart] = useVariant("chart", "lijn");
  const [density, setDensity] = useVariant("density", "ruim");
  const [role, setRole] = useVariant("rol", "regie");
  const [period, setPeriod] = useVariant("periode", "maand");
  const [modules, setModules] = useVariant("modules", ["omzet", "orders"]);
  const [rows, setRows] = useVariant("rijen", 12);
  const [empty, setEmpty] = useState(false);
  const { annotationMode, setAnnotationMode } = useAnnotations();
  const en = useOrbitLanguage() === "en";

  const variants: OrbitVariant[] = [
    {
      type: "choice",
      id: "chart",
      title: "Grafiek",
      options: [
        { id: "lijn", label: "Lijn" },
        { id: "staaf", label: "Staaf" },
        { id: "taart", label: "Taart", disabled: true },
      ],
      value: chart,
      defaultValue: "lijn",
      onChange: setChart,
      pages: (route) => route === "/",
    },
    {
      type: "range",
      id: "rijen",
      title: "Activiteiten",
      hint: "Hoeveel regels de lijst toont: leeg, normaal of overvol.",
      min: 0,
      max: 200,
      value: rows,
      defaultValue: 12,
      onChange: setRows,
      format: (n) => `${n} regels`,
      pages: (route) => route === "/",
    },
    {
      type: "choice",
      id: "density",
      title: en ? "Density" : "Dichtheid",
      options: [
        { id: "ruim", label: en ? "Comfortable" : "Ruim" },
        { id: "compact", label: "Compact" },
      ],
      value: density,
      defaultValue: "ruim",
      onChange: setDensity,
    },
    {
      // Three options, but long ones: they do not fit the pill, so they become a list.
      type: "choice",
      id: "rol",
      title: "Rol",
      options: [
        { id: "regie", label: "Regiebehandelaar" },
        { id: "mede", label: "Medebehandelaar" },
        { id: "admin", label: "Administratie" },
      ],
      value: role,
      defaultValue: "regie",
      onChange: setRole,
    },
    {
      type: "choice",
      id: "periode",
      title: "Periode",
      options: [
        { id: "dag", label: "Vandaag" },
        { id: "week", label: "Deze week" },
        { id: "maand", label: "Deze maand" },
        { id: "kwartaal", label: "Dit kwartaal" },
        { id: "jaar", label: "Dit jaar" },
        { id: "vorig", label: "Vorig jaar" },
        { id: "alles", label: "Alles" },
      ],
      value: period,
      defaultValue: "maand",
      onChange: setPeriod,
    },
    {
      type: "multi",
      id: "modules",
      title: "Modules",
      options: [
        { id: "omzet", label: "Omzet" },
        { id: "orders", label: "Orders" },
        { id: "klanten", label: "Klanten" },
        { id: "voorraad", label: "Voorraad", disabled: true },
      ],
      value: modules,
      defaultValue: ["omzet", "orders"],
      onChange: setModules,
    },
    { type: "switch", id: "leeg", title: "Lege staat", hint: "Alsof het account net is aangemaakt.", value: empty, defaultValue: false, onChange: setEmpty },
    { type: "switch", id: "pins", title: "Feedback-pins tonen", value: annotationMode, onChange: setAnnotationMode },
    { type: "action", id: "toast", title: "Toon een melding", onRun: () => window.alert("Opgeslagen") },
  ];

  return <OrbitShell variants={variants}>{children}</OrbitShell>;
}
