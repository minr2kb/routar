import { createApi, defineRouter } from '@routar/core';
import type { ApiTypes } from '@routar/core';
import { z } from 'zod';
import { clientExecutor, fetchExecutor } from '../../lib/executor';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUserAny = toUser as (raw: any) => ReturnType<typeof toUser>;

export const UserRouter = defineRouter('/users', {
  getList: {
    method: 'GET' as const,
    path: '/',
    response: z.array(UserRawSchema),
    adapter: (raw: any) => (raw as z.infer<typeof UserRawSchema>[]).map(toUser),
  },
  getDetail: {
    method: 'GET' as const,
    path: '/:id',
    request: z.object({
      path: z.object({ id: z.number() }),
    }),
    response: UserRawSchema,
    adapter: toUserAny,
  },
});

export const userApi = createApi(clientExecutor, UserRouter);
export const userServerApi = createApi(fetchExecutor, UserRouter);

export type UserApiTypes = ApiTypes<typeof userApi>;
export type User = UserApiTypes['getDetail']['response'];
