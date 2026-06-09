import { describe, expect, it, mock } from "bun:test";
import { createExecutor, dispatchExecutor } from "./create-executor.js";
import { definePlugin } from "./middleware.js";

const opts = { method: "GET" as const, url: "/test" };

describe("createExecutor", () => {
  it("passes through with no options", async () => {
    const execute = mock(async () => "result");
    const executor = createExecutor(execute);
    const result = await executor.execute(opts);
    expect(result).toBe("result");
    expect(execute).toHaveBeenCalledWith(opts);
  });

  it("applies first plugin as outermost wrapper (onRequest first, onResponse last)", async () => {
    const order: string[] = [];
    const plugin1 = definePlugin({
      onRequest: (o) => { order.push("p1-req"); return o; },
      onResponse: (res) => { order.push("p1-res"); return res; },
    });
    const plugin2 = definePlugin({
      onRequest: (o) => { order.push("p2-req"); return o; },
      onResponse: (res) => { order.push("p2-res"); return res; },
    });
    const executor = createExecutor(
      async () => { order.push("execute"); return "ok"; },
      { plugins: [plugin1, plugin2] },
    );
    await executor.execute(opts);
    expect(order).toEqual(["p1-req", "p2-req", "execute", "p2-res", "p1-res"]);
  });

  it("plugin can modify options passed downstream via onRequest", async () => {
    const execute = mock(async () => "ok");
    const executor = createExecutor(execute, {
      plugins: [definePlugin({ onRequest: (o) => ({ ...o, url: "/modified" }) })],
    });
    await executor.execute(opts);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/modified" }),
    );
  });

  it("unwrap transforms the raw response before it is returned", async () => {
    const executor = createExecutor(async () => ({ data: { id: 1 } }), {
      unwrap: (raw) => (raw as { data: unknown }).data,
    });
    const result = await executor.execute(opts);
    expect(result).toEqual({ id: 1 });
  });

  it("unwrap runs innermost — user plugin onResponse sees the unwrapped value", async () => {
    const seen: unknown[] = [];
    const executor = createExecutor(async () => ({ data: "payload" }), {
      plugins: [
        definePlugin({
          onResponse: (res) => {
            seen.push(res);
            return res;
          },
        }),
      ],
      unwrap: (raw) => (raw as { data: unknown }).data,
    });
    const result = await executor.execute(opts);
    // unwrap runs before the plugin's onResponse, so the plugin sees "payload".
    expect(seen).toEqual(["payload"]);
    expect(result).toBe("payload");
  });

  it("unwrap is not applied when omitted", async () => {
    const executor = createExecutor(async () => ({ data: { id: 1 } }));
    const result = await executor.execute(opts);
    expect(result).toEqual({ data: { id: 1 } });
  });
});

describe("dispatchExecutor", () => {
  it("delegates to the executor returned by resolver", async () => {
    const execute = mock(async () => "dispatched");
    const inner = createExecutor(execute);
    const executor = dispatchExecutor(() => inner);
    const result = await executor.execute(opts);
    expect(result).toBe("dispatched");
    expect(execute).toHaveBeenCalledWith(opts);
  });

  it("passes opts to resolver so it can branch", async () => {
    const aExecute = mock(async () => "a");
    const bExecute = mock(async () => "b");
    const executor = dispatchExecutor((o) =>
      o.url.startsWith("/a") ? createExecutor(aExecute) : createExecutor(bExecute),
    );
    await executor.execute({ method: "GET", url: "/a/resource" });
    await executor.execute({ method: "GET", url: "/b/resource" });
    expect(aExecute).toHaveBeenCalledTimes(1);
    expect(bExecute).toHaveBeenCalledTimes(1);
  });

  it("calls resolver on every request", async () => {
    const resolver = mock(() => createExecutor(async () => "ok"));
    const executor = dispatchExecutor(resolver);
    await executor.execute(opts);
    await executor.execute(opts);
    expect(resolver).toHaveBeenCalledTimes(2);
  });
});
