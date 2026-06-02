import { afterEach, describe, expect, it, mock } from "bun:test";
import { createFetchExecutor, HttpError } from "./create-fetch-executor.js";
import { definePlugin } from "./middleware.js";

const originalFetch = globalThis.fetch;

function mockFetch(response: Partial<Response>) {
  const m = mock(
    async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      ({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ mocked: true }),
        text: async () => JSON.stringify({ mocked: true }),
        ...response,
      }) as Response,
  );
  globalThis.fetch = m as unknown as typeof fetch;
  return m;
}

describe("createFetchExecutor", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("builds correct URL from baseURL + path", async () => {
    mockFetch({});
    const executor = createFetchExecutor("https://api.example.com");
    await executor.execute({ method: "GET", url: "/todos" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/todos",
      expect.anything(),
    );
  });

  it("preserves baseURL path prefix when joining route path", async () => {
    mockFetch({});
    const executor = createFetchExecutor("http://localhost:3000/api");
    await executor.execute({ method: "GET", url: "/todos" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/todos",
      expect.anything(),
    );
  });

  it("normalizes trailing slash in baseURL", async () => {
    mockFetch({});
    const executor = createFetchExecutor("https://api.example.com/");
    await executor.execute({ method: "GET", url: "/todos" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/todos",
      expect.anything(),
    );
  });

  it("appends query params to URL", async () => {
    const m = mockFetch({});
    const executor = createFetchExecutor("https://api.example.com");
    await executor.execute({ method: "GET", url: "/todos", params: { page: "1" } });
    expect(String(m.mock.calls[0][0])).toContain("page=1");
  });

  it("throws HttpError on non-2xx", async () => {
    mockFetch({ ok: false, status: 404, statusText: "Not Found" });
    const executor = createFetchExecutor("https://api.example.com");
    await expect(
      executor.execute({ method: "GET", url: "/todos" }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("returns null for 204 responses", async () => {
    mockFetch({ ok: true, status: 204, headers: new Headers() });
    const executor = createFetchExecutor("https://api.example.com");
    const result = await executor.execute({ method: "DELETE", url: "/todos/1" });
    expect(result).toBeNull();
  });

  it("does not set Content-Type for bodyless requests", async () => {
    const m = mockFetch({});
    const executor = createFetchExecutor("https://api.example.com");
    await executor.execute({ method: "GET", url: "/todos" });
    const headers = new Headers(m.mock.calls[0][1]?.headers);
    expect(headers.get("Content-Type")).toBeNull();
  });

  it("sets Content-Type for requests with body", async () => {
    const m = mockFetch({});
    const executor = createFetchExecutor("https://api.example.com");
    await executor.execute({ method: "POST", url: "/todos", body: { title: "test" } });
    const headers = new Headers(m.mock.calls[0][1]?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("Content-Type is not overridden by defaultHeaders when body is present", async () => {
    const m = mockFetch({});
    const executor = createFetchExecutor("https://api.example.com", {
      defaultHeaders: async () => ({ "Content-Type": "text/plain" }),
    });
    await executor.execute({ method: "POST", url: "/todos", body: { title: "test" } });
    const headers = new Headers(m.mock.calls[0][1]?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("Content-Type is forced to application/json even when headers option overrides it", async () => {
    const m = mockFetch({});
    const executor = createFetchExecutor("https://api.example.com");
    await executor.execute({
      method: "POST",
      url: "/todos",
      body: { title: "test" },
      headers: { "Content-Type": "text/plain" },
    });
    const headers = new Headers(m.mock.calls[0][1]?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("HttpError includes parsed response body", async () => {
    mockFetch({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({ message: "validation failed" }),
    });
    const executor = createFetchExecutor("https://api.example.com");
    try {
      await executor.execute({ method: "POST", url: "/todos" });
      expect(true).toBe(false); // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).body).toEqual({ message: "validation failed" });
    }
  });

  it("returns null for empty text body on 200", async () => {
    mockFetch({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => "",
    } as Partial<Response>);
    const executor = createFetchExecutor("https://api.example.com");
    const result = await executor.execute({ method: "GET", url: "/empty" });
    expect(result).toBeNull();
  });

  it("calls defaultHeaders on every request and applies them", async () => {
    const m = mockFetch({});
    const defaultHeaders = mock(async () => ({ "X-Auth": "token-123" }));
    const executor = createFetchExecutor("https://api.example.com", { defaultHeaders });
    await executor.execute({ method: "GET", url: "/todos" });
    expect(defaultHeaders).toHaveBeenCalledTimes(1);
    const headers = new Headers(m.mock.calls[0][1]?.headers);
    expect(headers.get("X-Auth")).toBe("token-123");
  });

  it("propagates network errors (non-HTTP) unchanged", async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const executor = createFetchExecutor("https://api.example.com");
    await expect(
      executor.execute({ method: "GET", url: "/todos" }),
    ).rejects.toThrow("Failed to fetch");
  });
});

describe("createFetchExecutor — plugin + retry execution order", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("plugin.onRequest runs on every retry attempt", async () => {
    const onRequest = mock((o: Parameters<typeof definePlugin>[0]["onRequest"] extends (o: infer O) => any ? O : never) => o);
    let calls = 0;
    globalThis.fetch = mock(async () => {
      if (++calls < 3) throw new TypeError("transient");
      return { ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify("ok") } as Response;
    }) as unknown as typeof fetch;

    const executor = createFetchExecutor("https://api.example.com", {
      retry: 3,
      plugins: [definePlugin({ onRequest })],
    });
    await executor.execute({ method: "GET", url: "/test" });
    expect(onRequest).toHaveBeenCalledTimes(3);
  });

  it("plugin.onError runs per failed attempt, not just after all retries", async () => {
    const errors: unknown[] = [];
    let calls = 0;
    globalThis.fetch = mock(async () => {
      if (++calls < 3) throw new TypeError("transient");
      return { ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify("ok") } as Response;
    }) as unknown as typeof fetch;

    const executor = createFetchExecutor("https://api.example.com", {
      retry: 3,
      plugins: [definePlugin({
        onError: (err) => { errors.push(err); throw err; },
      })],
    });
    await executor.execute({ method: "GET", url: "/test" });
    expect(errors).toHaveLength(2);
  });

  it("timeout resets per retry attempt", async () => {
    const signals: (AbortSignal | undefined)[] = [];
    let calls = 0;
    globalThis.fetch = mock(async (_url: any, init: any) => {
      signals.push(init?.signal);
      if (++calls < 2) throw new TypeError("transient");
      return { ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify("ok") } as Response;
    }) as unknown as typeof fetch;

    const executor = createFetchExecutor("https://api.example.com", {
      retry: 2,
      timeout: 5000,
    });
    await executor.execute({ method: "GET", url: "/test" });
    expect(signals).toHaveLength(2);
    expect(signals[0]).not.toBe(signals[1]);
  });

  it("auth plugin can update external token store in onError for next retry", async () => {
    let token = "old-token";
    const seenTokens: string[] = [];
    let calls = 0;
    globalThis.fetch = mock(async (_url: any, init: any) => {
      const auth = new Headers(init?.headers).get("Authorization") ?? "";
      seenTokens.push(auth);
      if (++calls < 2) {
        return { ok: false, status: 401, statusText: "Unauthorized", json: async () => null } as Response;
      }
      return { ok: true, status: 200, headers: new Headers(), text: async () => JSON.stringify("ok") } as Response;
    }) as unknown as typeof fetch;

    const executor = createFetchExecutor("https://api.example.com", {
      retry: { count: 1, shouldRetry: (err) => err instanceof Error && err.message.includes("401") },
      plugins: [definePlugin({
        onRequest: (opts) => ({ ...opts, headers: { ...opts.headers, Authorization: `Bearer ${token}` } }),
        onError: (err) => { token = "new-token"; throw err; },
      })],
    });

    try { await executor.execute({ method: "GET", url: "/test" }); } catch {}
    expect(seenTokens[0]).toBe("Bearer old-token");
    expect(seenTokens[1]).toBe("Bearer new-token");
  });
});
