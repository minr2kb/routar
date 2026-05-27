import { setupWorker } from "msw/browser";
import { allHandlers } from "./handlers";

/**
 * MSW browser service worker for development mocking.
 *
 * Setup:
 *   1. Run `npx msw init public/` once to copy the service worker file.
 *   2. Call `worker.start()` in your app's entry point (e.g. `providers.tsx`):
 *
 * @example
 * ```ts
 * // app/providers.tsx
 * if (process.env.NODE_ENV === 'development') {
 *   const { worker } = await import('@/mocks/browser')
 *   await worker.start({ onUnhandledRequest: 'bypass' })
 * }
 * ```
 */
export const worker = setupWorker(...allHandlers);
