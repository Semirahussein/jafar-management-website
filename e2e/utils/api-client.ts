import { APIRequestContext, request } from "@playwright/test";

/**
 * Minimal helper for driving the real JAFAR backend through its real HTTP API
 * (via the Next.js /api proxy, same as the browser does) purely for test
 * FIXTURE setup/teardown convenience - e.g. creating a branch, a manager, a
 * teacher, or a student that a UI-driven spec then exercises. This mirrors
 * exactly what app/lib/api.js does: fetch the CSRF cookie, then send it back
 * as the X-XSRF-TOKEN header on every state-changing request.
 */

export async function newAuthenticatedApiContext(
  baseURL: string,
  username: string,
  password: string
): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL });
  await loginApiContext(ctx, username, password);
  return ctx;
}

export async function readCsrf(ctx: APIRequestContext): Promise<string> {
  const state = await ctx.storageState();
  const cookie = state.cookies.find((c) => c.name === "XSRF-TOKEN");
  if (!cookie) throw new Error("XSRF-TOKEN cookie not present on this API context yet");
  return decodeURIComponent(cookie.value);
}

export async function loginApiContext(ctx: APIRequestContext, username: string, password: string) {
  const csrfRes = await ctx.get("/api/auth/csrf");
  if (!csrfRes.ok()) throw new Error(`GET /api/auth/csrf failed: ${csrfRes.status()}`);
  const csrf = await readCsrf(ctx);
  const res = await ctx.post("/api/auth/login", {
    headers: { "X-XSRF-TOKEN": csrf },
    data: { username, password, rememberMe: false },
  });
  if (!res.ok()) {
    throw new Error(`Login failed for "${username}": HTTP ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

async function withCsrf(
  ctx: APIRequestContext,
  method: "post" | "put" | "delete",
  path: string,
  data?: unknown,
  extraHeaders: Record<string, string> = {}
) {
  const csrf = await readCsrf(ctx);
  const res = await ctx[method](path, {
    headers: { "X-XSRF-TOKEN": csrf, ...extraHeaders },
    data,
  });
  return res;
}

export const apiPost = (ctx: APIRequestContext, path: string, data?: unknown, headers?: Record<string, string>) =>
  withCsrf(ctx, "post", path, data, headers);
export const apiPut = (ctx: APIRequestContext, path: string, data?: unknown, headers?: Record<string, string>) =>
  withCsrf(ctx, "put", path, data, headers);
export const apiDelete = (ctx: APIRequestContext, path: string) => withCsrf(ctx, "delete", path);

export async function expectOk(resPromise: Promise<import("@playwright/test").APIResponse>, label: string) {
  const res = await resPromise;
  if (!res.ok()) {
    throw new Error(`${label} failed: HTTP ${res.status()} ${await res.text()}`);
  }
  return res.json();
}
