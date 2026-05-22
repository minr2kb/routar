import { describe, expect, it, mock } from "bun:test";
import { createExecutor } from "./create-executor.js";
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
