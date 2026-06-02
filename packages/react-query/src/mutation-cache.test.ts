import { describe, expect, it, mock } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { routarMutationCache } from "./mutation-cache.js";

describe("routarMutationCache", () => {
  it("invalidates each key in meta.invalidates on success", () => {
    const qc = new QueryClient();
    const spy = mock(() => {});
    qc.invalidateQueries = spy as unknown as typeof qc.invalidateQueries;

    const cache = routarMutationCache(() => qc);
    const fakeMutation = {
      meta: { invalidates: [["todos"], ["users", "detail"]] },
    };

    // The MutationCache onSuccess callback is stored on its config.
    cache.config.onSuccess?.(
      undefined,
      undefined,
      undefined,
      fakeMutation as never,
      undefined as never,
    );

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, { queryKey: ["todos"] });
    expect(spy).toHaveBeenNthCalledWith(2, { queryKey: ["users", "detail"] });
  });

  it("does nothing when meta.invalidates is absent or empty", () => {
    const qc = new QueryClient();
    const spy = mock(() => {});
    qc.invalidateQueries = spy as unknown as typeof qc.invalidateQueries;

    const cache = routarMutationCache(() => qc);
    cache.config.onSuccess?.(
      undefined,
      undefined,
      undefined,
      { meta: {} } as never,
      undefined as never,
    );
    cache.config.onSuccess?.(
      undefined,
      undefined,
      undefined,
      {} as never,
      undefined as never,
    );

    expect(spy).not.toHaveBeenCalled();
  });
});
