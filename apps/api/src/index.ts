import { handleRandom } from "./features/random";
import { handleGetGames } from "./features/games/get-games";
import { handleGetConvocationTeams } from "./features/convocations/get-convocation-teams";
import { corsHeaders } from "./shared/cors";

export interface Env {
  ALLOWED_ORIGIN?: string;
  SUPABASE_DB_URL?: string;
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

    if (url.pathname === "/games" || url.pathname === "/games/") {
      return handleGetGames(request, env);
    }

    const convocationTeamsMatch = url.pathname.match(
      /^\/convocations\/([^/]+)\/teams\/?$/,
    );
    if (convocationTeamsMatch) {
      return handleGetConvocationTeams(
        request,
        env,
        convocationTeamsMatch[1],
        origin,
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
