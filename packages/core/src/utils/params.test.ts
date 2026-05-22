import { describe, expect, it } from "bun:test";
import { serializeParams } from "./params.js";

describe("serializeParams", () => {
  it("serializes simple key-value", () => {
    const result = serializeParams({ foo: "bar" });
    expect(result.get("foo")).toBe("bar");
  });
  it("skips null values", () => {
    const result = serializeParams({ foo: null });
    expect(result.has("foo")).toBe(false);
  });
  it("skips undefined values", () => {
    const result = serializeParams({ foo: undefined });
    expect(result.has("foo")).toBe(false);
  });
  it("expands arrays as repeated keys", () => {
    const result = serializeParams({ ids: [1, 2, 3] });
    expect(result.getAll("ids")).toEqual(["1", "2", "3"]);
  });
  it("handles empty object", () => {
    const result = serializeParams({});
    expect(result.toString()).toBe("");
  });
  it("skips null items in arrays", () => {
    const result = serializeParams({ ids: [1, null, 3] });
    expect(result.getAll("ids")).toEqual(["1", "3"]);
  });
  it("serializes numbers as strings", () => {
    const result = serializeParams({ page: 2 });
    expect(result.get("page")).toBe("2");
  });
  it("serializes booleans as strings", () => {
    const result = serializeParams({ active: true, deleted: false });
    expect(result.get("active")).toBe("true");
    expect(result.get("deleted")).toBe("false");
  });
});
