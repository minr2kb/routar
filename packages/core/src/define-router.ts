import type { RouterDef, RouterEndpoints } from './types.js';

export function defineRouter<TEndpoints extends RouterEndpoints>(
  prefix: string,
  endpoints: TEndpoints,
): RouterDef<TEndpoints> {
  return { prefix, endpoints };
}
