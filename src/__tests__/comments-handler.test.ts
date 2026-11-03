import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commentDeleteToken, createCommentsHandler, handleCommentsRequest } from "../server";

const options = { apiKey: "key", databaseId: "db", projectId: "proj" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const notionPage = (properties: Record<string, any>) => ({ id: "page-1", created_time: "2026-11-03T00:00:00.000Z", properties });

/** The body of the n-th call to Notion. */
const sent = (fetch: ReturnType<typeof vi.fn>, n: number) => JSON.parse(fetch.mock.calls[n][1].body);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handleCommentsRequest", () => {
  it("POST writes every field Orbit sends, component included", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json(notionPage({ Component: { rich_text: [{ plain_text: "Metric" }] } }), 200));
    vi.stubGlobal("fetch", fetch);

    const result = await handleCommentsRequest(
      {
        method: "POST",
        body: {
          annotationId: '[data-orbit-component="Metric"]',
          auteur: "Elwin",
          comment: "Te druk",
          pagina: "/assets/1",
          label: "Metric",
          varianten: "Rol: Beheer",
          component: "Metric",
          ignored: "x",
        },
      },
      options
    );

    expect(result.status).toBe(201);
    expect((result.body as any).component).toBe("Metric");
    const { parent, properties, children } = sent(fetch, 0);
    expect(parent).toEqual({ database_id: "db" });
    expect(properties.Component).toEqual({ rich_text: [{ text: { content: "Metric" } }] });
    expect(properties.Varianten).toEqual({ rich_text: [{ text: { content: "Rol: Beheer" } }] });
    expect(properties.Pagina).toEqual({ rich_text: [{ text: { content: "/assets/1" } }] });
    expect(properties.Project).toEqual({ relation: [{ id: "proj" }] });
    expect(children).toBeUndefined();
  });

  it("POST puts the screenshot in the page's body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ id: "up-1" }))
      .mockResolvedValueOnce(json({ id: "up-1" }))
      .mockResolvedValueOnce(json(notionPage({})));
    vi.stubGlobal("fetch", fetch);

    await handleCommentsRequest(
      { method: "POST", body: { annotationId: "a", comment: "c", screenshot: "data:image/jpeg;base64,aGk=" } },
      options
    );
    expect(sent(fetch, 2).children).toEqual([
      { object: "block", type: "image", image: { type: "file_upload", file_upload: { id: "up-1" } } },
    ]);
  });

  it("POST sends again without a column the database lacks", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ message: "Component is not a property that exists." }, 400))
      .mockResolvedValueOnce(json(notionPage({})));
    vi.stubGlobal("fetch", fetch);

    const result = await handleCommentsRequest(
      { method: "POST", body: { annotationId: "a", comment: "c", component: "Metric" } },
      options
    );
    expect(result.status).toBe(201);
    expect("Component" in sent(fetch, 0).properties).toBe(true);
    expect("Component" in sent(fetch, 1).properties).toBe(false);
  });

  it("POST refuses a comment without annotationId or text", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect((await handleCommentsRequest({ method: "POST", body: { comment: "c" } }, options)).status).toBe(400);
  });

  it("GET filters on the project, and on the element when asked", async () => {
    const fetch = vi.fn(async (_url?: string, _init?: RequestInit) => json({ results: [notionPage({ Comment: { rich_text: [{ plain_text: "Hoi" }] } })] }));
    vi.stubGlobal("fetch", fetch);

    const result = await handleCommentsRequest({ method: "GET", query: { annotationId: "a" } }, options);
    expect(result.status).toBe(200);
    expect((result.body as any)[0].comment).toBe("Hoi");
    expect(fetch.mock.calls[0][0]).toBe("https://api.notion.com/v1/databases/db/query");
    expect(sent(fetch, 0).filter.and).toEqual([
      { property: "Project", relation: { contains: "proj" } },
      { property: "Annotatie ID", rich_text: { equals: "a" } },
    ]);

    await handleCommentsRequest({ method: "GET", query: {} }, options);
    expect(sent(fetch, 1).filter.and).toHaveLength(1);
  });

  it("POST gives the writer a token to delete the comment, and only theirs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json(notionPage({}))));
    const result = await handleCommentsRequest({ method: "POST", body: { annotationId: "a", comment: "c" } }, options);
    const token = (result.body as any).deleteToken;
    expect(token).toBe(await commentDeleteToken("page-1", "key"));
    expect(token).not.toBe(await commentDeleteToken("page-2", "key"));
    expect(token).not.toBe(await commentDeleteToken("page-1", "other"));
  });

  it("DELETE archives the page with its token, and refuses without", async () => {
    const fetch = vi.fn(async (_url?: string, _init?: RequestInit) => json({ id: "page-1", archived: true }));
    vi.stubGlobal("fetch", fetch);
    const token = await commentDeleteToken("page-1", "key");

    expect((await handleCommentsRequest({ method: "DELETE", body: { id: "page-1" } }, options)).status).toBe(400);
    expect((await handleCommentsRequest({ method: "DELETE", body: { id: "page-2", token } }, options)).status).toBe(403);
    expect((await handleCommentsRequest({ method: "DELETE", body: { id: "page-1", token: "x" } }, options)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();

    const result = await handleCommentsRequest({ method: "DELETE", body: { id: "page-1", token } }, options);
    expect(result).toEqual({ status: 200, body: { id: "page-1" } });
    expect(fetch.mock.calls[0][0]).toBe("https://api.notion.com/v1/pages/page-1");
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: "PATCH" });
    expect(sent(fetch, 0)).toEqual({ archived: true });
  });

  it("signs with ORBIT_SECRET when there is one", async () => {
    vi.stubEnv("ORBIT_SECRET", "s3cret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json(notionPage({}))));
    const result = await handleCommentsRequest({ method: "POST", body: { annotationId: "a", comment: "c" } }, options);
    expect((result.body as any).deleteToken).toBe(await commentDeleteToken("page-1", "s3cret"));
    vi.unstubAllEnvs();
  });

  it("refuses other methods, and says so without the Notion settings", async () => {
    expect(await handleCommentsRequest({ method: "PUT" }, options)).toMatchObject({ status: 405, headers: { Allow: "GET, POST, DELETE" } });
    vi.stubEnv("NOTION_API_KEY", "");
    expect((await handleCommentsRequest({ method: "GET" }, { databaseId: "db", projectId: "proj" })).status).toBe(500);
    vi.unstubAllEnvs();
  });
});

describe("createCommentsHandler", () => {
  let server: Server | undefined;
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

  /** A real Node server, as Vite's dev server runs it: no parsed body, the query in the url. */
  async function listen() {
    server = createServer(createCommentsHandler(options));
    await new Promise<void>((done) => server!.listen(0, "127.0.0.1", done));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  it("reads the body and query off a plain Node request", async () => {
    const base = await listen();
    const realFetch = globalThis.fetch;
    const notion = vi.fn(async (_url?: string, _init?: RequestInit) => json(notionPage({})));
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
      url.startsWith(base) ? realFetch(url, init) : notion(url, init)
    );

    const posted = await fetch(`${base}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annotationId: "a", comment: "c", component: "Metric" }),
    });
    expect(posted.status).toBe(201);
    expect(sent(notion, 0).properties.Component).toEqual({ rich_text: [{ text: { content: "Metric" } }] });

    notion.mockResolvedValueOnce(json({ results: [] }));
    const got = await fetch(`${base}/?annotationId=a`);
    expect(await got.json()).toEqual([]);
    expect(sent(notion, 1).filter.and[1]).toEqual({ property: "Annotatie ID", rich_text: { equals: "a" } });

    const { id, deleteToken } = await posted.json();
    const deleted = await fetch(`${base}/`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token: deleteToken }),
    });
    expect(deleted.status).toBe(200);
    expect(sent(notion, 2)).toEqual({ archived: true });
  });

  it("takes a body the framework already parsed, as Vercel does", async () => {
    const notion = vi.fn(async (_url?: string, _init?: RequestInit) => json(notionPage({})));
    vi.stubGlobal("fetch", notion);
    const res = { writeHead: vi.fn(), end: vi.fn() };
    await createCommentsHandler(options)(
      { method: "POST", url: "/api/comments", query: {}, body: { annotationId: "a", comment: "c", component: "Metric" } } as any,
      res as any
    );
    expect(res.writeHead).toHaveBeenCalledWith(201, { "Content-Type": "application/json" });
    expect(sent(notion, 0).properties.Component).toBeDefined();
  });
});
