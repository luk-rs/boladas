import { handleRandom } from "./features/random";
import { corsHeaders } from "./shared/cors";

export interface Env {
  ALLOWED_ORIGIN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/random" || url.pathname === "/random/") {
      return handleRandom(request, origin);
    }

    return new Response("Not found", { status: 404 });
  },
};
