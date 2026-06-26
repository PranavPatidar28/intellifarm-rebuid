import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiGet, apiPost } from "./api";

/**
 * The client API wrapper is the backbone of every authenticated web request,
 * so these tests pin its contract: JSON handling, the transparent 401 ->
 * refresh -> retry flow, and FormData passthrough.
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === null ? "" : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("performs a GET and returns parsed JSON", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ hello: "world" }));

    const result = await apiGet<{ hello: string }>("/dashboard");

    expect(result).toEqual({ hello: "world" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/v1/dashboard");
    expect((init as RequestInit).credentials).toBe("include");
  });

  it("refreshes the token once and retries on a 401, then succeeds", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      // first request -> 401
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401))
      // refresh -> ok
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      // retried request -> ok
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiGet<{ ok: boolean }>("/dashboard");

    expect(result).toEqual({ ok: true });
    // original + refresh + retry
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/v1/auth/refresh");
  });

  it("throws ApiError when the refresh also fails", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401))
      // refresh -> not ok
      .mockResolvedValueOnce(new Response("", { status: 401 }));

    await expect(apiGet("/dashboard")).rejects.toBeInstanceOf(ApiError);
    // original + refresh attempt, but no retry
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not attempt a refresh loop on /auth/refresh itself", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "nope" }, 401));

    await expect(apiPost("/auth/refresh")).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends JSON bodies with a Content-Type header", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiPost("/auth/otp/request", { phone: "9876543210" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ phone: "9876543210" }));
  });

  it("does not force a JSON Content-Type on FormData bodies", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const form = new FormData();
    form.append("file", new Blob(["x"]), "x.png");
    await apiPost("/users/me/photo", form);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    // The browser sets the multipart boundary; we must not override it.
    expect(headers.get("Content-Type")).toBeNull();
  });
});
