import { describe, expect, it, mock, spyOn } from "bun:test";
import { buildChain, createExecutor } from "./create-executor.js";
import {
  definePlugin,
  logger,
  TimeoutError,
  withRetry,
  withTimeout,
} from "./middleware.js";
import type { ExecuteOptions, ExecutorPlugin } from "./types.js";

const opts: ExecuteOptions = { method: "GET", url: "/test" };

describe("plugin system (createExecutor)", () => {
  it("runs onRequest and modifies opts", async () => {
    let seen: string | undefined;
    const execute = mock(async (o: ExecuteOptions) => {
      seen = o.headers?.["X-Token"];
      return "ok";
    });
    const executor = createExecutor(execute, {
      plugins: [
        definePlugin({
          onRequest: (o) => ({
            ...o,
            headers: { ...o.headers, "X-Token": "abc" },
          }),
        }),
      ],
    });
    await executor.execute(opts);
    expect(seen).toBe("abc");
  });

  it("runs onResponse and transforms result", async () => {
    const executor = createExecutor(async () => ({ raw: true }), {
      plugins: [
        definePlugin({
          onResponse: (res) => ({ ...(res as object), transformed: true }),
        }),
      ],
    });
    expect(await executor.execute(opts)).toEqual({ raw: true, transformed: true });
  });

  it("runs onError and rethrows", async () => {
    const onError = mock((_err: unknown) => {
      throw new Error("wrapped");
    }) as ExecutorPlugin["onError"];
    const executor = createExecutor(
      async () => { throw new Error("original"); },
      { plugins: [definePlugin({ onError })] },
    );
    await expect(executor.execute(opts)).rejects.toThrow("wrapped");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("skips undefined hooks", async () => {
    const execute = mock(async () => "ok");
    const executor = createExecutor(execute, {
      plugins: [definePlugin({ name: "noop" })],
    });
    await expect(executor.execute(opts)).resolves.toBe("ok");
  });

  it("applies plugins in declaration order", async () => {
    const order: string[] = [];
    const makePlugin = (name: string): ExecutorPlugin =>
      definePlugin({
        name,
        onRequest: (o) => { order.push(name); return o; },
      });
    const executor = createExecutor(async () => "ok", {
      plugins: [makePlugin("first"), makePlugin("second")],
    });
    await executor.execute(opts);
    expect(order).toEqual(["first", "second"]);
  });
});

describe("withRetry", () => {
  it("succeeds on first attempt, calls execute once", async () => {
    const execute = mock(async () => "ok");
    const mw = withRetry(3);
    expect(await mw(opts, execute)).toBe("ok");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and eventually succeeds", async () => {
    let calls = 0;
    const execute = mock(async () => {
      if (++calls < 3) throw new Error("transient");
      return "ok";
    });
    const mw = withRetry(3);
    expect(await mw(opts, execute)).toBe("ok");
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all retries", async () => {
    const execute = mock(async () => { throw new Error("always fails"); });
    const mw = withRetry(2);
    await expect(mw(opts, execute)).rejects.toThrow("always fails");
    expect(execute).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("stops retrying when shouldRetry returns false", async () => {
    const execute = mock(async () => { throw new Error("skip retry"); });
    const mw = withRetry(3, { shouldRetry: () => false });
    await expect(mw(opts, execute)).rejects.toThrow("skip retry");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("passes attempt index to shouldRetry", async () => {
    const seen: number[] = [];
    const execute = mock(async () => { throw new Error("fail"); });
    const mw = withRetry(2, {
      shouldRetry: (_, attempt) => { seen.push(attempt); return true; },
    });
    await expect(mw(opts, execute)).rejects.toThrow();
    expect(seen).toEqual([0, 1]);
  });
});

describe("withTimeout", () => {
  it("resolves normally when request completes within timeout", async () => {
    const mw = withTimeout(1000);
    expect(await mw(opts, async () => "ok")).toBe("ok");
  });

  it("aborts when request exceeds timeout", async () => {
    const execute = (o: ExecuteOptions) =>
      new Promise((_, reject) => {
        const t = setTimeout(() => reject(new Error("should not reach")), 500);
        o.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("AbortError", "AbortError"));
        });
      });
    const mw = withTimeout(10);
    await expect(mw(opts, execute)).rejects.toThrow();
  });

  it("merges with existing signal — aborts when either fires first", async () => {
    const execute = mock(async (_o: ExecuteOptions) => "ok");
    const mw = withTimeout(1000);
    const signal = AbortSignal.abort();
    await mw({ ...opts, signal }, execute);
    expect(execute.mock.calls[0][0].signal?.aborted).toBe(true);
  });

  it("throws TimeoutError (not generic AbortError) when timeout fires", async () => {
    const execute = (o: ExecuteOptions) =>
      new Promise((_, reject) => {
        const t = setTimeout(() => reject(new Error("should not reach")), 500);
        o.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(o.signal!.reason);
        });
      });
    const mw = withTimeout(10);
    await expect(mw(opts, execute)).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe("logger plugin", () => {
  it("logs request and success", async () => {
    const log = mock((_msg: string, _data?: unknown) => {});
    const executor = createExecutor(async () => "ok", {
      plugins: [logger({ log })],
    });
    await executor.execute({ method: "POST", url: "/items" });
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toContain("POST /items");
    expect(log.mock.calls[1][0]).toContain("POST /items");
  });

  it("logs request and error, then rethrows", async () => {
    const log = mock((_msg: string, _data?: unknown) => {});
    const executor = createExecutor(
      async () => { throw new Error("oops"); },
      { plugins: [logger({ log })] },
    );
    await expect(
      executor.execute({ method: "GET", url: "/fail" }),
    ).rejects.toThrow("oops");
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[1][0]).toContain("error");
  });

  it("defaults to console.log", async () => {
    const spy = spyOn(console, "log").mockImplementation(() => {});
    const executor = createExecutor(async () => "ok", {
      plugins: [logger()],
    });
    await executor.execute(opts);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("records duration between request and response", async () => {
    const logs: string[] = [];
    const executor = createExecutor(async () => "ok", {
      plugins: [logger({ log: (msg) => logs.push(msg) })],
    });
    await executor.execute(opts);
    expect(logs[1]).toMatch(/\d+ms/);
  });
});

describe("plugins + retry + timeout compose (via buildChain)", () => {
  it("plugin sees request headers, retry retries, timeout applies per attempt", async () => {
    let headerSeen: string | undefined;
    let calls = 0;
    const execute = mock(async (o: ExecuteOptions) => {
      headerSeen = o.headers?.["X-Auth"];
      if (++calls < 2) throw new Error("transient");
      return "ok";
    });
    const executor = createExecutor(
      buildChain(execute, [withRetry(2), withTimeout(1000)]),
      {
        plugins: [
          definePlugin({
            onRequest: (o) => ({
              ...o,
              headers: { ...o.headers, "X-Auth": "token" },
            }),
          }),
        ],
      },
    );
    await expect(executor.execute(opts)).resolves.toBe("ok");
    expect(execute).toHaveBeenCalledTimes(2);
    expect(headerSeen).toBe("token");
  });
});
