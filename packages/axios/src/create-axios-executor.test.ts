import { describe, expect, it, mock } from "bun:test";
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
});
