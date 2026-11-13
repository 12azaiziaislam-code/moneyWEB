import type { Env } from './_lib/env';
import { handleApiRequest } from './_lib/router';

/**
 * Single entry point for every /api/* route (Pages Functions).
 * Everything else is served as static assets from /dist with SPA fallback.
 */
export const onRequest: PagesFunction = async (context) => {
  return handleApiRequest(context.request, context.env as unknown as Env, {
    waitUntil: (promise: Promise<unknown>) => context.waitUntil(promise as Promise<unknown>),
  });
};
