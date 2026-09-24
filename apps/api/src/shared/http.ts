import { corsHeaders } from "./cors";

export function jsonResponse(
  body: unknown,
  status: number,
  origin?: string,
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    },
  });
}

export function jsonError(
  status: number,
  error: string,
  origin?: string,
): Response {
  return jsonResponse({ error }, status, origin);
}
