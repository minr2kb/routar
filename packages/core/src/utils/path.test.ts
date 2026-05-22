import { describe, expect, it } from "bun:test";
import { joinPaths, resolvePath } from "./path.js";

describe("joinPaths", () => {
  it("joins two segments", () => {
    expect(joinPaths("/todos", "/:id")).toBe("/todos/:id");
  });
  it("normalizes double slashes", () => {
    expect(joinPaths("/todos/", "/:id")).toBe("/todos/:id");
  });
  it("removes trailing slash", () => {
    expect(joinPaths("/todos", "/")).toBe("/todos");
  });
  it("handles empty prefix", () => {
    expect(joinPaths("", "/todos")).toBe("/todos");
  });
  it("handles single segment", () => {
    expect(joinPaths("/todos")).toBe("/todos");
  });
});

describe("resolvePath", () => {
  it("replaces single param", () => {
    expect(resolvePath("/todos/:id", { id: 1 })).toBe("/todos/1");
  });
  it("replaces multiple params", () => {
    expect(
      resolvePath("/users/:userId/posts/:postId", { userId: 42, postId: 7 }),
    ).toBe("/users/42/posts/7");
  });
  it("returns template unchanged when no params", () => {
    expect(resolvePath("/todos")).toBe("/todos");
  });
  it("throws for missing param", () => {
    expect(() => resolvePath("/todos/:id", {})).toThrow(
      "Missing path parameter: id",
    );
  });
  it("encodes special characters", () => {
    expect(resolvePath("/search/:q", { q: "hello world" })).toBe(
      "/search/hello%20world",
    );
  });
});
