import { HttpError } from "@routar/core";
import { describe, expect, it, mock } from "bun:test";
import { HTTPError as KyHTTPError } from "ky";
import type { KyInstance } from "ky";
import { createKyExecutor } from "./create-ky-executor.js";

type CallMock = ReturnType<
  typeof mock<(url: string, options?: unknown) => Promise<Response>>
>;

function makeResponse(overrides: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => JSON.stringify({ mocked: true }),
    ...overrides,
  } as Response;
}

function makeCallMock(response = makeResponse()): CallMock {
  return mock(async (_url: string, _options?: unknown) => response);
}

function makeInstance(callMock: CallMock): KyInstance {
  const instance = Object.assign(callMock, {
    extend: () => instance,
    create: () => instance,
    stop: () => {},
    get: callMock,
    post: callMock,
    put: callMock,
    patch: callMock,
    delete: callMock,
    head: callMock,
  }) as unknown as KyInstance;
  return instance;
}

describe("createKyExecutor", () => {
  it("strips leading slash from URL", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect(callMock.mock.calls[0][0]).toBe("todos");
  });

  it("strips leading slash from nested paths", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    await executor.execute({ method: "GET", url: "/users/123/todos" });
    expect(callMock.mock.calls[0][0]).toBe("users/123/todos");
  });

  it("passes serialized searchParams when params are provided", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    await executor.execute({ method: "GET", url: "/todos", params: { page: "1" } });
    const opts = callMock.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.searchParams).toBeInstanceOf(URLSearchParams);
    expect((opts.searchParams as URLSearchParams).get("page")).toBe("1");
  });

  it("omits searchParams when params are absent", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    await executor.execute({ method: "GET", url: "/todos" });
    const opts = callMock.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.searchParams).toBeUndefined();
  });

  it("uses json option when body is present", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    await executor.execute({ method: "POST", url: "/todos", body: { title: "test" } });
    const opts = callMock.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.json).toEqual({ title: "test" });
  });

  it("omits json option when body is absent", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    await executor.execute({ method: "GET", url: "/todos" });
    const opts = callMock.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.json).toBeUndefined();
  });

  it("returns null for 204 responses", async () => {
    const callMock = makeCallMock(makeResponse({ status: 204, text: async () => "" }));
    const executor = createKyExecutor(makeInstance(callMock));
    const result = await executor.execute({ method: "DELETE", url: "/todos/1" });
    expect(result).toBeNull();
  });

  it("returns null for 205 responses", async () => {
    const callMock = makeCallMock(makeResponse({ status: 205, text: async () => "" }));
    const executor = createKyExecutor(makeInstance(callMock));
    const result = await executor.execute({ method: "POST", url: "/todos/reset" });
    expect(result).toBeNull();
  });

  it("returns null for empty text body on 200", async () => {
    const callMock = makeCallMock(makeResponse({ text: async () => "" }));
    const executor = createKyExecutor(makeInstance(callMock));
    const result = await executor.execute({ method: "GET", url: "/empty" });
    expect(result).toBeNull();
  });

  it("parses JSON response body", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    const result = await executor.execute({ method: "GET", url: "/todos" });
    expect(result).toEqual({ mocked: true });
  });

  it("resolves instance from async factory (SSR path)", async () => {
    const callMock = makeCallMock();
    const instance = makeInstance(callMock);
    const factory = mock(async () => instance);
    const executor = createKyExecutor(factory);
    await executor.execute({ method: "GET", url: "/todos" });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(callMock.mock.calls[0][0]).toBe("todos");
  });

  it("treats object with extend as KyInstance, not factory", async () => {
    const callMock = makeCallMock();
    const instance = makeInstance(callMock);
    const executor = createKyExecutor(instance);
    await executor.execute({ method: "GET", url: "/items" });
    expect(callMock).toHaveBeenCalledTimes(1);
  });

  function makeKyHttpError(status: number, body: unknown): KyHTTPError {
    const response = {
      status,
      statusText: status === 404 ? "Not Found" : "Internal Server Error",
      json: async () => body,
    } as unknown as Response;
    return new KyHTTPError(
      response,
      {} as Request,
      // biome-ignore lint/suspicious/noExplicitAny: minimal options for test fixture
      {} as any,
    );
  }

  function makeThrowingInstance(error: unknown): KyInstance {
    const callMock = mock(async () => {
      throw error;
    }) as unknown as CallMock;
    return makeInstance(callMock);
  }

  it("normalizes a ky HTTPError to HttpError", async () => {
    const kyError = makeKyHttpError(404, { message: "missing" });
    const executor = createKyExecutor(makeThrowingInstance(kyError));
    await expect(
      executor.execute({ method: "GET", url: "/todos/999" }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("populates HttpError fields from the ky HTTPError response", async () => {
    const kyError = makeKyHttpError(500, { error: "boom" });
    const executor = createKyExecutor(makeThrowingInstance(kyError));
    const err = await executor
      .execute({ method: "GET", url: "/todos" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(500);
    expect((err as HttpError).statusText).toBe("Internal Server Error");
    expect((err as HttpError).body).toEqual({ error: "boom" });
  });

  it("preserves the original ky HTTPError on HttpError.cause", async () => {
    const kyError = makeKyHttpError(404, { message: "missing" });
    const executor = createKyExecutor(makeThrowingInstance(kyError));
    const err = await executor
      .execute({ method: "GET", url: "/todos/999" })
      .catch((e) => e);
    expect((err as HttpError).cause).toBe(kyError);
  });

  it("re-throws non-HTTPError errors (network failures) unchanged", async () => {
    const networkError = new TypeError("Failed to fetch");
    const executor = createKyExecutor(makeThrowingInstance(networkError));
    const err = await executor
      .execute({ method: "GET", url: "/todos" })
      .catch((e) => e);
    expect(err).toBe(networkError);
    expect(err).not.toBeInstanceOf(HttpError);
  });

  it("passes headers and signal to ky", async () => {
    const callMock = makeCallMock();
    const executor = createKyExecutor(makeInstance(callMock));
    const signal = AbortSignal.timeout(5000);
    await executor.execute({
      method: "GET",
      url: "/todos",
      headers: { "X-Custom": "value" },
      signal,
    });
    const opts = callMock.mock.calls[0][1] as Record<string, unknown>;
    expect((opts.headers as Record<string, string>)["X-Custom"]).toBe("value");
    expect(opts.signal).toBe(signal);
  });
});
