import { describe, expect, it, mock } from "bun:test";
import type { AxiosInstance } from "axios";
import { createAxiosExecutor } from "./create-axios-executor.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = ReturnType<typeof mock<(...args: any[]) => any>>;

function makeInstance(baseURL: string, requestMock: AnyMock) {
  return {
    interceptors: {},
    defaults: { baseURL },
    request: requestMock,
  } as unknown as AxiosInstance;
}

describe("createAxiosExecutor", () => {
  it("joins baseURL and route path correctly", async () => {
    const requestMock: AnyMock = mock(async () => ({ data: {} }));
    const executor = createAxiosExecutor(makeInstance("https://api.example.com", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect((requestMock.mock.calls as [unknown[]][])[0][0]).toMatchObject({
      url: "https://api.example.com/todos",
    });
  });

  it("preserves baseURL path prefix when joining route path", async () => {
    const requestMock: AnyMock = mock(async () => ({ data: {} }));
    const executor = createAxiosExecutor(makeInstance("http://localhost:3000/api", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect((requestMock.mock.calls as [unknown[]][])[0][0]).toMatchObject({
      url: "http://localhost:3000/api/todos",
    });
  });

  it("normalizes trailing slash in baseURL", async () => {
    const requestMock: AnyMock = mock(async () => ({ data: {} }));
    const executor = createAxiosExecutor(makeInstance("https://api.example.com/", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect((requestMock.mock.calls as [unknown[]][])[0][0]).toMatchObject({
      url: "https://api.example.com/todos",
    });
  });

  it("works without baseURL", async () => {
    const requestMock: AnyMock = mock(async () => ({ data: {} }));
    const executor = createAxiosExecutor(makeInstance("", requestMock));
    await executor.execute({ method: "GET", url: "/todos" });
    expect((requestMock.mock.calls as [unknown[]][])[0][0]).toMatchObject({
      url: "/todos",
    });
  });
});
