import { describe, expect, it } from "bun:test";
import { buildQueryKey, prefixToSegments } from "./key.js";

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
});
