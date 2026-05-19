import type {
  HttpMethod,
  RequestShape,
  Validator,
  ValidatorOutput,
} from './types.js';

// request O + adapter O
export function endpoint<
  TRequest extends RequestShape,
  TResponse extends Validator<unknown>,
  TOut,
>(spec: {
  method: HttpMethod;
  path: string;
  request: Validator<TRequest>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): {
  method: HttpMethod;
  path: string;
  request: Validator<TRequest>;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// request O + adapter X
export function endpoint<
  TRequest extends RequestShape,
  TResponse extends Validator<unknown>,
>(spec: {
  method: HttpMethod;
  path: string;
  request: Validator<TRequest>;
  response: TResponse;
}): {
  method: HttpMethod;
  path: string;
  request: Validator<TRequest>;
  response: TResponse;
};

// request X + adapter O
export function endpoint<
  TResponse extends Validator<unknown>,
  TOut,
>(spec: {
  method: HttpMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
}): {
  method: HttpMethod;
  path: string;
  response: TResponse;
  adapter: (raw: ValidatorOutput<TResponse>) => TOut;
};

// request X + adapter X
export function endpoint<
  TResponse extends Validator<unknown>,
>(spec: {
  method: HttpMethod;
  path: string;
  response: TResponse;
}): {
  method: HttpMethod;
  path: string;
  response: TResponse;
};

export function endpoint(spec: unknown): unknown {
  return spec;
}
