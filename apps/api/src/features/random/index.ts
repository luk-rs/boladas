import { corsHeaders } from "../../shared/cors";
import { RandomPayload } from "./types";

function getRandomPayload(): RandomPayload {
  const value = Math.floor(Math.random() * 1_000_000);
  return {
    value,
    timestamp: new Date().toISOString(),
  };
}

export function handleRandom(
  request: Request,
  allowedOrigin?: string,
): Response {
  if (request.method !== "GET") {
    // Should depend on how the main router handles this, but here we can return 405 or just ignore
    // For now, let's assume the router hits this only on match, or we check method
    return new Response("Method not allowed", { status: 405 });
  }

  return Response.json(getRandomPayload(), {
    headers: corsHeaders(allowedOrigin),
  });
}
