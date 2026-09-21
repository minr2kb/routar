---
"@routar/core": minor
---

Add endpoint-level error response schemas.

Endpoints can now declare `errors` with typed 4xx/5xx status codes, and `createApi`
validates declared `HttpError.body` values before rethrowing them. `ApiTypes` also
exposes the inferred error response map for each endpoint.

React Query bindings now preserve endpoint typing for endpoints that declare error
schemas.
