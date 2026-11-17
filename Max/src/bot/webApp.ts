import { config } from "../config.js";

export function miniAppUrl(launchToken: string): string {
  const base = config.publicBaseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/miniapp/`);
  url.searchParams.set("launch", launchToken);
  return url.toString();
}