import { createExecutor, createFetchExecutor, logger } from "@routar/core";
import { LOCAL_API_URL } from "../constants";

// Local executor — fetch with absolute URL works in both SSR and CSR.
// `baseURL` is passed as a **factory** (`() => string`): createFetchExecutor
// resolves it per-request, so the origin can depend on the runtime environment
// (SSR vs CSR, multi-tenant host, …) without spinning up a second executor.
const localFetch = createFetchExecutor(() => LOCAL_API_URL);

export const localExecutor = createExecutor((opts) => localFetch.execute(opts), {
  plugins: [
    logger({ log: (msg, data) => console.log(`[localExecutor] ${msg}`, data) }),
  ],
});
