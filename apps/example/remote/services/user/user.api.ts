import type { ApiTypes } from "@routar/core";
import { createApi, defineRouter, endpoint } from "@routar/core";
import { z } from "zod";
import { apiExecutor } from "../../lib/executor";

const UserRawSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  phone: z.string(),
  website: z.string(),
  company: z.object({ name: z.string() }),
  address: z.object({ city: z.string() }),
});

const toUser = (raw: z.infer<typeof UserRawSchema>) => ({
  id: raw.id,
  name: raw.name,
  username: raw.username,
  email: raw.email,
  phone: raw.phone,
  website: raw.website,
  companyName: raw.company.name,
  city: raw.address.city,
});

export const UserRouter = defineRouter("/users", {
  getList: endpoint({
    method: "GET" as const,
    path: "/",
    response: z.array(UserRawSchema),
    adapter: (raw) => raw.map(toUser),
  }),
  getDetail: endpoint({
    method: "GET" as const,
    path: "/:id",
    request: z.object({
      path: z.object({ id: z.coerce.number() }),
    }),
    response: UserRawSchema,
    adapter: toUser,
  }),
});

export const userApi = createApi(apiExecutor, UserRouter);

export type UserApiTypes = ApiTypes<typeof userApi>;
export type User = UserApiTypes["getDetail"]["response"];
