import { test, expect, vi, beforeEach, afterEach, describe } from "vitest";
import { createApiClient } from "./api.js";

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    headers: { get: () => null },
  };
}

describe("createApiClient", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    document.cookie = "";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("GET requests hit the /api-prefixed path with JSON Accept header and no CSRF header", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const api = createApiClient();

    const result = await api("/dashboard");

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/dashboard");
    expect(options.credentials).toBe("same-origin");
    expect(options.cache).toBe("no-store");
    expect(options.headers.Accept).toBe("application/json");
    expect(options.headers["X-XSRF-TOKEN"]).toBeUndefined();
  });

  test("POST requests serialize the body as JSON and set Content-Type", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    const api = createApiClient();

    await api("/students", { method: "POST", body: { fullName: "Ahmed" } });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ fullName: "Ahmed" }));
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  test("non-GET requests attach the decoded XSRF-TOKEN cookie as X-XSRF-TOKEN header", async () => {
    document.cookie = "XSRF-TOKEN=abc%20123";
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const api = createApiClient();

    await api("/students", { method: "POST", body: { fullName: "Ahmed" } });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["X-XSRF-TOKEN"]).toBe("abc 123");
  });

  test("GET requests never attach the X-XSRF-TOKEN header even when the cookie is present", async () => {
    document.cookie = "XSRF-TOKEN=abc123";
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const api = createApiClient();

    await api("/dashboard");

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers["X-XSRF-TOKEN"]).toBeUndefined();
  });

  test("a non-ok response throws an Error carrying status and parsed body details", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ message: "The username or password is incorrect." }, { ok: false, status: 401 })
    );
    const api = createApiClient();

    await expect(api("/auth/login", { method: "POST", body: { username: "x", password: "y" } }))
      .rejects.toMatchObject({ message: "The username or password is incorrect.", status: 401 });
  });

  test("a 401 on a protected endpoint dispatches jafar:session-expired", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, { ok: false, status: 401 }));
    const api = createApiClient();
    const handler = vi.fn();
    window.addEventListener("jafar:session-expired", handler);

    await expect(api("/dashboard")).rejects.toThrow();

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("jafar:session-expired", handler);
  });

  test("a 401 from /auth/login itself does NOT dispatch jafar:session-expired", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ message: "Bad credentials" }, { ok: false, status: 401 }));
    const api = createApiClient();
    const handler = vi.fn();
    window.addEventListener("jafar:session-expired", handler);

    await expect(api("/auth/login", { method: "POST", body: {} })).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("jafar:session-expired", handler);
  });

  test("a 401 from /auth/me does NOT dispatch jafar:session-expired", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, { ok: false, status: 401 }));
    const api = createApiClient();
    const handler = vi.fn();
    window.addEventListener("jafar:session-expired", handler);

    await expect(api("/auth/me")).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("jafar:session-expired", handler);
  });

  test("a 204 No Content response resolves to null", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => null, headers: { get: () => null } });
    const api = createApiClient();

    await expect(api("/students/1", { method: "DELETE" })).resolves.toBeNull();
  });

  test("falls back to a generic message when the error body cannot be parsed", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
      headers: { get: () => null },
    });
    const api = createApiClient();

    await expect(api("/dashboard")).rejects.toMatchObject({ message: "Request failed (500)", status: 500 });
  });
});
