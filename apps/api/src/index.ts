export interface Env {
  ALLOWED_ORIGIN?: string;
}

function corsHeaders(origin?: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function randomPayload() {
  const value = Math.floor(Math.random() * 1_000_000);
  return {
    value,
    timestamp: new Date().toISOString(),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/random" && request.method === "GET") {
      return Response.json(randomPayload(), {
        headers: corsHeaders(origin),
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
