import type { Plugin } from "vite";

interface MockComment {
  id: string;
  annotationId: string;
  auteur: string;
  comment: string;
  status: "Open" | "In behandeling" | "Opgelost";
  antwoord: string | null;
  aangemaakt: string;
  pagina: string;
  label: string;
  varianten?: string;
}

const comments: MockComment[] = [
  // Feedback on the same id the annotation uses ("2" = the Omzet card), so the
  // annotation and its feedback live in one thread on one component.
  {
    id: "1",
    annotationId: "2",
    auteur: "Klant A",
    comment: "Deze KPI moet nog gekoppeld worden aan de echte data bron.",
    status: "Open",
    antwoord: null,
    aangemaakt: new Date(Date.now() - 86400000).toISOString(),
    pagina: "/",
    label: "Omzet card",
  },
  {
    id: "2",
    annotationId: "3",
    auteur: "Klant B",
    comment: "Kleur past niet bij het design systeem, graag aanpassen.",
    status: "In behandeling",
    antwoord: "Wordt meegenomen in de volgende sprint.",
    aangemaakt: new Date(Date.now() - 172800000).toISOString(),
    pagina: "/",
    label: "Orders card",
  },
  // Feedback on an element without an annotation, placed through the inspector —
  // shows up as its own standalone feedback pin.
  {
    id: "3",
    annotationId: "activiteit",
    auteur: "Klant C",
    comment: "De volgorde van de activiteiten is onduidelijk — nieuwste eerst?",
    status: "Opgelost",
    antwoord: "Is opgelost in v1.2.",
    aangemaakt: new Date(Date.now() - 259200000).toISOString(),
    pagina: "/",
    label: "Recente activiteit",
  },
];

let nextId = 4;

export function mockCommentsApi(): Plugin {
  return {
    name: "mock-comments-api",
    configureServer(server) {
      server.middlewares.use("/api/comments", (req, res) => {
        res.setHeader("Content-Type", "application/json");

        if (req.method === "GET") {
          const url = new URL(req.url ?? "/", "http://localhost");
          const annotationId = url.searchParams.get("annotationId");
          const filtered = annotationId
            ? comments.filter((c) => c.annotationId === annotationId)
            : [...comments];
          res.end(JSON.stringify(filtered));
          return;
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: Buffer) => (body += chunk.toString()));
          req.on("end", () => {
            const data = JSON.parse(body);
            const newComment: MockComment = {
              id: String(nextId++),
              annotationId: data.annotationId,
              auteur: data.auteur,
              comment: data.comment,
              status: "Open",
              antwoord: null,
              aangemaakt: new Date().toISOString(),
              pagina: data.pagina ?? "/",
              label: data.label ?? "",
              varianten: data.varianten,
            };
            comments.push(newComment);
            res.statusCode = 201;
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
      });
    },
  };
}
