import { validateMaxInitData } from "./maxAuth.js";
import { verifyLaunchToken } from "./launchToken.js";

export function resolveMaxUserId(
  searchParams: URLSearchParams,
  initDataHeader: string | undefined,
): number | null {
  const launch = searchParams.get("launch");
  const initData =
    searchParams.get("initData")?.trim() ||
    (typeof initDataHeader === "string" ? initDataHeader.trim() : "");
  let maxUserId: number | null = null;
  if (launch) {
    const claims = verifyLaunchToken(launch);
    if (claims) maxUserId = claims.maxUserId;
  }
  if (maxUserId === null && initData) {
    const validated = validateMaxInitData(initData);
    if (validated) maxUserId = validated.maxUserId;
  }
  return maxUserId;
}