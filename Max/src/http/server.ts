import http from "node:http";
import { config } from "../config.js";
import { getBotUser } from "../db/botUsers.js";
import { handleUpdate } from "../bot/menu.js";
import type { MaxUpdate } from "../max/client.js";
import { validateMaxInitData } from "../miniapp/maxAuth.js";
import { verifyLaunchToken } from "../miniapp/launchToken.js";
import { serveMiniApp } from "../miniapp/static.js";

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function pathname(url: string | undefined): string {
  if (!url) return "/";
  const q = url.indexOf("?");
  return q >= 0 ? url.slice(0, q) : url;
}

export function createHttpServer(): http.Server {
  return http.createServer((req, res) => {
    void (async () => {
      try {
        const rawUrl = req.url ?? "/";
        const pathOnly = pathname(rawUrl);
        const method = req.method ?? "GET";

        if (method === "GET" && pathOnly === "/health") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("ok");
          return;
        }

        if (method === "POST" && pathOnly === "/webhooks/max") {
          if (config.webhookSecret) {
            const secret = req.headers["x-max-bot-api-secret"];
            if (secret !== config.webhookSecret) {
              res.writeHead(401);
              res.end();
              return;
            }
          }
          const raw = await readBody(req);
          const body = JSON.parse(raw) as MaxUpdate | { updates?: MaxUpdate[] };
          const list = "updates" in body && Array.isArray(body.updates) ? body.updates : [body as MaxUpdate];
          for (const u of list) await handleUpdate(u);
          res.writeHead(200);
          res.end();
          return;
        }

        if (method === "GET" && pathOnly === "/api/me") {
          const q = new URL(rawUrl, "http://localhost").searchParams;
          const launch = q.get("launch");
          const initHeader = req.headers["x-max-init-data"];
          const initData =
            q.get("initData")?.trim() ||
            (typeof initHeader === "string" ? initHeader.trim() : "");
          let maxUserId: number | null = null;
          if (launch) {
            const claims = verifyLaunchToken(launch);
            if (claims) maxUserId = claims.maxUserId;
          }
          if (maxUserId === null && initData) {
            const validated = validateMaxInitData(initData);
            if (validated) maxUserId = validated.maxUserId;
          }
          if (maxUserId === null) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "missing or invalid auth" }));
            return;
          }
          const user = await getBotUser(maxUserId);
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          });
          res.end(
            JSON.stringify({
              maxUserId,
              tier: user?.tier ?? "free",
              freeRecordLimit: config.freeRecordLimit,
              supabaseUrl: config.supabaseUrl || null,
              supabaseAnonKey: config.supabaseAnonKey || null,
            }),
          );
          return;
        }

        if (
          (method === "GET" || method === "HEAD") &&
          (pathOnly === "/miniapp" || pathOnly.startsWith("/miniapp/"))
        ) {
          await serveMiniApp(res, pathOnly);
          return;
        }

        res.writeHead(404);
        res.end();
      } catch (err) {
        console.error("HTTP error:", err);
        res.writeHead(500);
        res.end();
      }
    })();
  });
}

export function listenHttp(): void {
  const server = createHttpServer();
  const bind = process.env.HTTP_BIND ?? "0.0.0.0";
  server.listen(config.httpPort, bind, () => {
    console.log(`HTTP ${bind}:${config.httpPort} (Mini App, /webhooks/max, /api/me)`);
  });
}