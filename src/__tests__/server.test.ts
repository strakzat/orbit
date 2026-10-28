import { afterEach, describe, expect, it, vi } from "vitest";
import { buildNotionCommentChildren, uploadNotionImage } from "../server";

// "hi" as a JPEG, as far as Notion's upload cares.
const DATA_URL = "data:image/jpeg;base64,aGk=";
const input = { annotationId: "a", comment: "c", screenshot: DATA_URL };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("uploadNotionImage", () => {
  it("creates an upload, sends the bytes, and gives the id", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ id: "up-1" }))
      .mockResolvedValueOnce(json({ id: "up-1", status: "uploaded" }));
    vi.stubGlobal("fetch", fetch);

    expect(await uploadNotionImage(DATA_URL, "key")).toBe("up-1");

    const [createUrl, create] = fetch.mock.calls[0];
    expect(createUrl).toBe("https://api.notion.com/v1/file_uploads");
    expect(JSON.parse(create.body)).toEqual({
      mode: "single_part",
      filename: "feedback.jpg",
      content_type: "image/jpeg",
    });

    const [sendUrl, send] = fetch.mock.calls[1];
    expect(sendUrl).toBe("https://api.notion.com/v1/file_uploads/up-1/send");
    // The multipart boundary is fetch's to set.
    expect(send.headers["Content-Type"]).toBeUndefined();
    const file = (send.body as FormData).get("file") as File;
    expect(await file.text()).toBe("hi");
    expect(file.type).toBe("image/jpeg");
  });

  it("refuses what is not an image data URL", async () => {
    await expect(uploadNotionImage("https://example.com/a.jpg", "key")).rejects.toThrow();
  });
});

describe("buildNotionCommentChildren", () => {
  it("is empty without a screenshot", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await buildNotionCommentChildren({ annotationId: "a", comment: "c" }, "key")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is an image block on the upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(json({ id: "up-1" })).mockResolvedValueOnce(json({ id: "up-1" }))
    );
    expect(await buildNotionCommentChildren(input, "key")).toEqual([
      { object: "block", type: "image", image: { type: "file_upload", file_upload: { id: "up-1" } } },
    ]);
  });

  it("leaves the screenshot out when Notion refuses it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ message: "nope" }, 400)));
    expect(await buildNotionCommentChildren(input, "key")).toEqual([]);
  });
});
