import crypto from "node:crypto";
import { config } from "../config.js";

export type PayCheckoutClaims = {
  typ: "pay";
  maxUserId: number;
  exp: number;
};

const TTL_SEC = 60 * 30;

function signingKey(): string {
  if (!config.launchTokenSecret) throw new Error("LAUNCH_TOKEN_SECRET required for pay tokens");
  return config.launchTokenSecret;
}

export function issuePayCheckoutToken(maxUserId: number): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const payload = JSON.stringify({ typ: "pay", maxUserId, exp } satisfies PayCheckoutClaims);
  const sig = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyPayCheckoutToken(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  const [body, sig] = t.split(".");
  if (!body || !sig) return null;
  const payload = Buffer.from(body, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const claims = JSON.parse(payload) as PayCheckoutClaims;
    if (claims.typ !== "pay" || claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (!Number.isFinite(claims.maxUserId) || claims.maxUserId <= 0) return null;
    return claims.maxUserId;
  } catch {
    return null;
  }
}