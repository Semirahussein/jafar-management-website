const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const apiBaseUrl = (configuredApiBaseUrl || "http://localhost:8080").replace(
  /\/+$/,
  ""
);

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function createBasicAuthorization(auth) {
  if (!auth) {
    return null;
  }

  if (
    typeof auth.username !== "string" ||
    !auth.username.trim() ||
    typeof auth.password !== "string" ||
    !auth.password
  ) {
    throw new TypeError("API authentication requires a username and password.");
  }

  const credentials = new TextEncoder().encode(
    `${auth.username.trim()}:${auth.password}`
  );
  let encodedCredentials = "";

  for (const byte of credentials) {
    encodedCredentials += String.fromCharCode(byte);
  }

  return `Basic ${btoa(encodedCredentials)}`;
}

function getErrorMessage(body, statusText) {
  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    for (const key of ["detail", "message", "title"]) {
      if (typeof body[key] === "string" && body[key].trim()) {
        return body[key];
      }
    }
  }

  return statusText || "The API request failed.";
}

export async function apiRequest(path, { auth, body, headers, ...options } = {}) {
  if (typeof path !== "string" || !path.startsWith("/api/")) {
    throw new TypeError("API paths must start with /api/.");
  }

  const baseUrl = new URL(apiBaseUrl);
  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new TypeError("The API base URL must use HTTP or HTTPS.");
  }

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  const authorization = createBasicAuthorization(auth);
  if (authorization) {
    requestHeaders.set("Authorization", authorization);
  }

  let requestBody;
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    method: options.method || (requestBody === undefined ? "GET" : "POST"),
    headers: requestHeaders,
    body: requestBody,
    cache: "no-store",
  });

  let responseBody = null;
  if (response.status !== 204) {
    const responseText = await response.text();
    if (responseText) {
      responseBody = response.headers
        .get("content-type")
        ?.includes("json")
        ? JSON.parse(responseText)
        : responseText;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(responseBody, response.statusText),
      response.status,
      responseBody
    );
  }

  return responseBody;
}
