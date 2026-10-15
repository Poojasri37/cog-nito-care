const LOCAL_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"];

function getAllowedOrigins(): Set<string> {
  const configuredOrigins =
    process.env["CORS_ORIGINS"]
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  return new Set([...LOCAL_ORIGINS, ...configuredOrigins]);
}

function addVaryOrigin(headers: Headers): void {
  const values = (headers.get("Vary") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!values.some((value) => value.toLowerCase() === "origin")) values.push("Origin");
  headers.set("Vary", values.join(", "));
}

export function withApiCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  addVaryOrigin(headers);

  const origin = request.headers.get("Origin");
  if (origin && getAllowedOrigins().has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function apiCorsPreflight(request: Request): Response {
  const response = new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
    },
  });
  return withApiCors(request, response);
}
