// types
export type {
  HttpMethod,
  ExecuteOptions,
  Executor,
  ExecutorMiddleware,
  Validator,
  ValidatorOutput,
  RequestShape,
  EndpointSpec,
  InferResponse,
  RouterEntry,
  RouterEndpoints,
  RouterDef,
  ApiTypes,
} from './types.js';

// core functions
export { defineRouter } from './define-router.js';
export { endpoint } from './define-endpoint.js';
export type { PathParams } from './define-endpoint.js';
export { createApi } from './create-api.js';
export { createExecutor } from './create-executor.js';

// middleware
export { defineMiddleware, withRetry, withTimeout, withLogger } from './middleware.js';

// utilities (exported for executor implementors)
export { joinPaths, resolvePath } from './utils/path.js';
export { serializeParams } from './utils/params.js';
export { ValidationError } from './utils/validate.js';
