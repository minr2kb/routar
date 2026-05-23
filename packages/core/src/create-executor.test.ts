import { describe, expect, it, mock } from "bun:test";
import { createExecutor, dispatchExecutor } from "./create-executor.js";
import { defineMiddleware } from "./middleware.js";

const opts = { method: "GET" as const, url: "/test" };

describe("createExecutor", () => {
  it("passes through with no middlewares", async () => {
    const execute = mock(async () => "result");
    const executor = createExecutor(execute);
    const result = await executor.execute(opts);
    expect(result).toBe("result");
    expect(execute).toHaveBeenCalledWith(opts);
  });

  it("applies first middleware as outermost wrapper", async () => {
    const order: string[] = [];
    const mw1 = defineMiddleware(async (o, next) => {
      order.push("mw1-in");
      const r = await next(o);
      order.push("mw1-out");
      return r;
    });
    const mw2 = defineMiddleware(async (o, next) => {
      order.push("mw2-in");
      const r = await next(o);
      order.push("mw2-out");
      return r;
    });
    const executor = createExecutor(async () => {
      order.push("execute");
      return "ok";
    }, [mw1, mw2]);
    await executor.execute(opts);
    expect(order).toEqual([
      "mw1-in",
      "mw2-in",
      "execute",
      "mw2-out",
      "mw1-out",
    ]);
  });

  it("middleware can modify options passed downstream", async () => {
    const execute = mock(async () => "ok");
    const mw = defineMiddleware((o, next) => next({ ...o, url: "/modified" }));
    const executor = createExecutor(execute, [mw]);
    await executor.execute(opts);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/modified" }),
    );
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
