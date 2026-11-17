import crypto from "node:crypto";
import { config } from "../config.js";

export type LaunchClaims = {
  maxUserId: number;
  exp: number;
};

export async function issueLaunchToken(maxUserId: number, ttlSec = 3600): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = JSON.stringify({ maxUserId, exp });
  const sig = crypto.createHmac("sha256", config.launchTokenSecret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyLaunchToken(token: string): LaunchClaims | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const payload = Buffer.from(body, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", config.launchTokenSecret).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const claims = JSON.parse(payload) as LaunchClaims;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}