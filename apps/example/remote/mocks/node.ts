import { setupServer } from "msw/node";
import { allHandlers } from "./handlers";

/**
 * MSW Node.js server for use in tests (Jest / Vitest / Bun test).
 *
 * @example
 * ```ts
 * import { server } from '@/mocks/node'
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
 * afterEach(() => server.resetHandlers())
 * afterAll(() => server.close())
 * ```
 */
export const server = setupServer(...allHandlers);
