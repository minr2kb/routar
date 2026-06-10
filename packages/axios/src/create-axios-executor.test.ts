import { HttpError } from "@routar/core";
import { describe, expect, it, mock } from "bun:test";
import { AxiosError } from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { createAxiosExecutor } from "./create-axios-executor.js";

type RequestMock = ReturnType<
  typeof mock<(config: AxiosRequestConfig) => Promise<{ data: Record<string, unknown> }>>
>;

function makeInstance(baseURL: string, requestMock: RequestMock) {
  return {
    interceptors: {},
    defaults: { baseURL },
    request: requestMock,
  } as unknown as AxiosInstance;
}

function makeRequestMock(): RequestMock {
  return mock(async (_config: AxiosRequestConfig) => ({ data: {} as Record<string, unknown> }));
}

describe("createAxiosExecutor", () => {
  it("joins baseURL and route path correctly", async () => {
    const requestMock = makeRequestMock();
    const executor = createAxiosExecutor(makeInstance("https://api.example.com", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect(requestMock.mock.calls[0][0]).toMatchObject({
      url: "https://api.example.com/todos",
    });
  });

  it("preserves baseURL path prefix when joining route path", async () => {
    const requestMock = makeRequestMock();
    const executor = createAxiosExecutor(makeInstance("http://localhost:3000/api", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect(requestMock.mock.calls[0][0]).toMatchObject({
      url: "http://localhost:3000/api/todos",
    });
  });

  it("normalizes trailing slash in baseURL", async () => {
    const requestMock = makeRequestMock();
    const executor = createAxiosExecutor(makeInstance("https://api.example.com/", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect(requestMock.mock.calls[0][0]).toMatchObject({
      url: "https://api.example.com/todos",
    });
  });

  it("works without baseURL", async () => {
    const requestMock = makeRequestMock();
    const executor = createAxiosExecutor(makeInstance("", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect(requestMock.mock.calls[0][0]).toMatchObject({ url: "/todos" });
  });

  it("resolves instance from async factory function (SSR path)", async () => {
    const requestMock = makeRequestMock();
    const factory = mock(async () => makeInstance("https://api.example.com", requestMock));
    const executor = createAxiosExecutor(factory);
    await executor.execute({ method: "GET", url: "/todos" });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(requestMock.mock.calls[0][0]).toMatchObject({
      url: "https://api.example.com/todos",
    });
  });

  it("treats a function with interceptors + request as AxiosInstance, not factory", async () => {
    const requestMock = makeRequestMock();
    const instance = makeInstance("https://api.example.com", requestMock);
    const executor = createAxiosExecutor(instance);
    await executor.execute({ method: "GET", url: "/items" });
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  function makeAxiosError(status: number, data: unknown): AxiosError {
    return new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      undefined,
      {},
      {
        status,
        statusText: status === 404 ? "Not Found" : "Internal Server Error",
        data,
        headers: {},
        // biome-ignore lint/suspicious/noExplicitAny: minimal config for test fixture
        config: {} as any,
      },
    );
  }

  function makeThrowingInstance(error: unknown): AxiosInstance {
    return {
      interceptors: {},
      defaults: { baseURL: "https://api.example.com" },
      request: mock(async () => {
        throw error;
      }),
    } as unknown as AxiosInstance;
  }

  it("normalizes a 4xx AxiosError to HttpError", async () => {
    const axiosError = makeAxiosError(404, { message: "missing" });
    const executor = createAxiosExecutor(makeThrowingInstance(axiosError));
    await expect(
      executor.execute({ method: "GET", url: "/todos/999" }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("populates HttpError fields from a 5xx AxiosError response", async () => {
    const axiosError = makeAxiosError(500, { error: "boom" });
    const executor = createAxiosExecutor(makeThrowingInstance(axiosError));
    const err = await executor
      .execute({ method: "GET", url: "/todos" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(500);
    expect((err as HttpError).statusText).toBe("Internal Server Error");
    expect((err as HttpError).body).toEqual({ error: "boom" });
  });

  it("preserves the original AxiosError on HttpError.cause", async () => {
    const axiosError = makeAxiosError(404, { message: "missing" });
    const executor = createAxiosExecutor(makeThrowingInstance(axiosError));
    const err = await executor
      .execute({ method: "GET", url: "/todos/999" })
      .catch((e) => e);
    expect((err as HttpError).cause).toBe(axiosError);
  });

  it("re-throws non-response errors (network failures) unchanged", async () => {
    const networkError = new AxiosError("Network Error", AxiosError.ERR_NETWORK);
    const executor = createAxiosExecutor(makeThrowingInstance(networkError));
    const err = await executor
      .execute({ method: "GET", url: "/todos" })
      .catch((e) => e);
    expect(err).toBe(networkError);
    expect(err).not.toBeInstanceOf(HttpError);
  });
});
