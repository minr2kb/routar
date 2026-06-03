import { describe, expect, it } from "bun:test";
import { buildInfiniteKey, buildQueryKey, prefixToSegments } from "./key.js";

describe("prefixToSegments", () => {
  it("splits a prefix into non-empty segments", () => {
    expect(prefixToSegments("/todos")).toEqual(["todos"]);
    expect(prefixToSegments("/api/v1/todos")).toEqual(["api", "v1", "todos"]);
  });
  it("returns an empty array for root or empty prefix", () => {
    expect(prefixToSegments("/")).toEqual([]);
    expect(prefixToSegments("")).toEqual([]);
  });
});

describe("buildQueryKey", () => {
  it("appends params when defined", () => {
    expect(buildQueryKey(["todos"], "getList", { query: { x: 1 } })).toEqual([
      "todos",
      "getList",
      { query: { x: 1 } },
    ]);
  });
  it("drops the trailing element when params is undefined", () => {
    expect(buildQueryKey(["todos"], "getList", undefined)).toEqual([
      "todos",
      "getList",
    ]);
  });

  it("normalizes empty params (null / {}) to the same key as undefined", () => {
    const bare = buildQueryKey(["todos"], "getList", undefined);
    expect(buildQueryKey(["todos"], "getList", null)).toEqual(bare);
    expect(buildQueryKey(["todos"], "getList", {})).toEqual(bare);
  });

  it("keeps non-empty params (object with keys) as a trailing element", () => {
    expect(buildQueryKey(["todos"], "getList", { query: {} })).toEqual([
      "todos",
      "getList",
      { query: {} },
    ]);
  });
});

describe("buildInfiniteKey", () => {
  it("inserts an 'infinite' segment before params", () => {
    expect(buildInfiniteKey(["todos"], "getList", { query: { x: 1 } })).toEqual(
      ["todos", "getList", "infinite", { query: { x: 1 } }],
    );
  });

  it("drops empty params but keeps the 'infinite' segment", () => {
    expect(buildInfiniteKey(["todos"], "getList", undefined)).toEqual([
      "todos",
      "getList",
      "infinite",
    ]);
    expect(buildInfiniteKey(["todos"], "getList", {})).toEqual([
      "todos",
      "getList",
      "infinite",
    ]);
  });

  it("is a prefix-child of the standard key (so standard invalidation covers it)", () => {
    const standard = buildQueryKey(["todos"], "getList", undefined);
    const infinite = buildInfiniteKey(["todos"], "getList", undefined);
    expect(infinite.slice(0, standard.length)).toEqual(standard);
  });
});
