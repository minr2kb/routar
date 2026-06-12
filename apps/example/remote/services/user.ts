import { createApi, defineRouter, endpoint } from "@routar/core";
import { createQueries } from "@routar/react-query";
import { type } from "arktype";
import { z } from "zod";
import { apiExecutor } from "../lib/executors/api";

// SE-11 — the response schema is an ArkType (Standard Schema) validator. routar
// validates it via the `~standard` interface; everything else is unchanged.
const User = type({
  id: "number",
  name: "string",
  email: "string",
  company: { name: "string" },
  address: { city: "string" },
});

// `adapter` runs after validation — flatten the nested API shape for the UI.
// (Keep `response` a pure schema; never put `.transform()` on it.)
const toUser = (u: typeof User.infer) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  companyName: u.company.name,
  city: u.address.city,
});

export const UserRouter = defineRouter("/users", {
  getList: endpoint({ method: "GET", path: "/", response: User.array(), adapter: (xs) => xs.map(toUser) }),
  getDetail: endpoint({
    method: "GET",
    path: "/:id",
    request: { path: z.object({ id: z.coerce.number() }) },
    response: User,
    adapter: toUser,
  }),
});

// SE-7 — `validate: { response: 'warn' }` keeps validating, but on a mismatch it
// passes the raw value through and reports via `onValidationError` instead of
// throwing. The safe default for a third-party API that may drift.
export const userApi = createApi(apiExecutor, UserRouter, {
  validate: { response: "warn" },
  onValidationError: (err, ctx) =>
    console.warn(`[user drift] ${ctx.method} ${ctx.url}: ${err.message}`),
});

export const userQuery = createQueries(userApi);

export type User = ReturnType<typeof toUser>;
