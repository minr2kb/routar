---
"@routar/react-query": minor
---

Query, mutation, and infinite-query accessors from `createQueries` now accept `headers`/`timeout` in their options object, forwarded to the underlying endpoint call (`{ headers?, timeout? }`, matching core's `EndpointCallOptions`). Previously there was no way to pass per-call headers through a `createQueries` accessor — flatten or not — since `queryFn`/`mutationFn` only ever forwarded the `AbortSignal`. Also works via `createQueries({ defaults })` / `createQueries({ infinite })` for endpoint-wide defaults; call-site `headers`/`timeout` win, with `headers` merged shallowly over the default.

```ts
useSuspenseQuery(todoQuery.getDetail({ id }, { headers: { 'X-Tenant-Id': tenantId } }))
useMutation(todoQuery.create({ headers: { 'Idempotency-Key': key } }))
useSuspenseInfiniteQuery(todoQuery.getList.infinite(params, { headers: { ... } }))
```

Calling the raw `createApi` client directly already supported this — this change brings the `createQueries` accessors in line with it.
