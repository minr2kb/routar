import { definePlugin, HttpError } from "@routar/core";

// A hand-written plugin (definePlugin) exercising every lifecycle hook.
// - onRequest : stamp a correlation header. Per-call `headers` are seeded first,
//               so spreading `opts.headers` last lets a call-site header win.
// - onResponse: pass-through here (this is where you'd unwrap an envelope).
// - onError   : transport failures are normalized to `HttpError` across *every*
//               executor (fetch, axios, ky), so we can branch on `.status` and
//               rethrow a friendlier error. onError MUST always throw.
export const correlationPlugin = definePlugin({
  name: "correlation",
  onRequest: (opts) => ({
    ...opts,
    headers: { "X-Request-Id": crypto.randomUUID(), ...opts.headers },
  }),
  onResponse: (res) => res,
  onError: (err) => {
    if (err instanceof HttpError && err.status === 404) {
      throw new Error(`Not found (mapped from HttpError ${err.status})`);
    }
    throw err as never;
  },
});
