import type postgres from "postgres";
import type { Env } from "../index";
import { jsonError } from "./http";

type Sql = ReturnType<typeof postgres>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_TOKEN_LENGTH = 8192;

type TokenHeader = {
  alg?: string;
};

type TokenClaims = {
  sub?: string;
  role?: string;
  exp?: number;
};

export type AuthSuccess = {
  userId: string;
};

let cachedDbJwtSecret: string | undefined;

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1];
  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  return token;
}

/**
 * Resolve the Supabase user id from the caller's access token.
 * Uses the same Supabase access token the app already stores.
 * Does not open a database connection unless the JWT secret has to be read from Postgres.
 */
export async function authenticateRequest(
  request: Request,
  env: Env,
  getSql: () => Sql,
): Promise<AuthSuccess | Response> {
  const origin = env.ALLOWED_ORIGIN;
  const token = readBearerToken(request);
  if (!token) {
    return jsonError(401, "Missing access token", origin);
  }

  const header = peekHeader(token);
  if (!header || header.alg === "none") {
    return jsonError(401, "Invalid access token", origin);
  }

  const envSecret = env.SUPABASE_JWT_SECRET?.trim();
  if (header.alg === "HS256" && envSecret) {
    const userId = await verifyHs256AccessToken(token, envSecret);
    if (!userId) return jsonError(401, "Invalid access token", origin);
    return { userId };
  }

  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    const userId = await verifyWithGoTrue(
      token,
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
    );
    if (userId === "unavailable") {
      return jsonError(503, "Auth service unavailable", origin);
    }
    if (!userId) return jsonError(401, "Invalid access token", origin);
    return { userId };
  }

  if (header.alg === "HS256") {
    const secret = await readDbJwtSecret(getSql());
    if (!secret) {
      return jsonError(500, "Missing auth configuration", origin);
    }
    const userId = await verifyHs256AccessToken(token, secret);
    if (!userId) return jsonError(401, "Invalid access token", origin);
    return { userId };
  }

  return jsonError(500, "Missing auth configuration", origin);
}

/**
 * Run `fn` in a transaction where auth.uid() is the verified user.
 * The Worker connects as a privileged database role, so RLS does not apply.
 * Security-definer helpers still read request.jwt.claims, which is what PostgREST sets.
 */
export async function withUserContext<T>(
  sql: Sql,
  userId: string,
  fn: (tx: Sql) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({
    sub: userId,
    role: "authenticated",
  });

  const result = await sql.begin(async (tx) => {
    // Same session settings PostgREST applies after it verifies a Supabase access token.
    // auth.uid() reads request.jwt.claim.sub, then request.jwt.claims.
    await tx.unsafe(
      `select
         set_config('request.jwt.claims', $1, true),
         set_config('request.jwt.claim.sub', $2, true),
         set_config('request.jwt.claim.role', 'authenticated', true)`,
      [claims, userId],
    );
    return fn(tx as unknown as Sql);
  });
  return result as T;
}

export async function verifyHs256AccessToken(
  token: string,
  secret: string,
): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerSegment, payloadSegment, signatureSegment] = parts;

    const header = decodeJsonSegment(headerSegment) as TokenHeader;
    if (header.alg !== "HS256") return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signature = decodeBase64Url(signatureSegment);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature.buffer,
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
    );
    if (!valid) return null;

    return userIdFromPayload(payloadSegment);
  } catch {
    return null;
  }
}

function peekHeader(token: string): TokenHeader | null {
  const segment = token.split(".")[0];
  if (!segment) return null;
  try {
    const header = decodeJsonSegment(segment) as TokenHeader;
    if (!header || typeof header.alg !== "string") return null;
    return header;
  } catch {
    return null;
  }
}

function userIdFromPayload(payloadSegment: string): string | null {
  let claims: TokenClaims;
  try {
    claims = decodeJsonSegment(payloadSegment) as TokenClaims;
  } catch {
    return null;
  }

  if (claims.role !== "authenticated") return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
    return null;
  }
  if (typeof claims.sub !== "string" || !UUID_RE.test(claims.sub)) return null;
  return claims.sub;
}

async function verifyWithGoTrue(
  token: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null | "unavailable"> {
  const endpoint = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });
  } catch (error: unknown) {
    console.error("Auth service request failed:", error);
    return "unavailable";
  }

  if (!response.ok) return null;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }

  if (!body || typeof body !== "object") return null;
  const id = (body as { id?: unknown }).id;
  if (typeof id !== "string" || !UUID_RE.test(id)) return null;
  return id;
}

async function readDbJwtSecret(sql: Sql): Promise<string | null> {
  if (cachedDbJwtSecret) return cachedDbJwtSecret;

  const rows = await sql<{ secret: string | null }[]>`
    select current_setting('app.settings.jwt_secret', true) as secret
  `;
  const secret = rows[0]?.secret?.trim();
  if (!secret) return null;
  cachedDbJwtSecret = secret;
  return secret;
}

function decodeJsonSegment(segment: string): unknown {
  const bytes = decodeBase64Url(segment);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function decodeBase64Url(segment: string): Uint8Array<ArrayBuffer> {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
