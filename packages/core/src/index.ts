// types

export type { ApiClient, ApiClientWithRouter } from "./create-api.js";
export { createApi } from "./create-api.js";
export { createExecutor, dispatchExecutor } from "./create-executor.js";
export type {
  FetchExecutorOptions,
  FetchRetryOption,
} from "./create-fetch-executor.js";
export {
  createFetchExecutor,
  HttpError,
} from "./create-fetch-executor.js";
export type { PathParams } from "./define-endpoint.js";
export { endpoint } from "./define-endpoint.js";
// core functions
export { defineRouter, isRouterDef } from "./define-router.js";
// standard schema interop
export type { StandardSchemaV1 } from "./standard-schema.js";
// plugin
export { definePlugin, logger, TimeoutError } from "./middleware.js";
export type {
  AnyValidator,
  ApiTypes,
  CreateApiOptions,
  CreateExecutorOptions,
  EndpointCallOptions,
  EndpointSpec,
  ExecuteOptions,
  Executor,
  ExecutorPlugin,
  HttpMethod,
  InferResponse,
  RequestShape,
  RouterDef,
  RouterEndpoints,
  RouterEntry,
  ValidationErrorContext,
  ValidationMode,
  Validator,
  ValidatorOutput,
} from "./types.js";
export { serializeParams } from "./utils/params.js";
// utilities (exported for executor implementors)
export { joinPaths, resolvePath } from "./utils/path.js";
export { createParser, runValidator } from "./utils/run-validator.js";
export { StandardSchemaError, ValidationError } from "./utils/validate.js";
