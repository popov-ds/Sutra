import http from "node:http";
import { handlePayCheckoutHttp } from "../billing/payCheckoutHttp.js";
import type { YooWebhookEvent } from "../billing/yookassa.js";
import { notifyProActivated } from "../bot/billingFlow.js";
import { config } from "../config.js";
import { getBotUser, upsertBotUser } from "../db/botUsers.js";
import { dbEnabled } from "../db/pool.js";
import { activatePro } from "../db/subscriptions.js";
import { isProActive } from "../db/users.js";
import { isProPlanId } from "../domain/billingPlans.js";
import { handleUpdate } from "../bot/menu.js";
import type { MaxUpdate } from "../max/client.js";
import { resolveMaxUserId } from "../miniapp/resolveUser.js";
import { setLocalStats } from "../miniapp/localStatsStore.js";
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

function initDataHeader(req: http.IncomingMessage): string | undefined {
  const h = req.headers["x-max-init-data"];
  if (typeof h === "string") return h.trim();
  if (Array.isArray(h)) return h[0]?.trim();
  return undefined;
}

export function createHttpServer(): http.Server {
  return http.createServer((req, res) => {
    void (async () => {
      try {
        const rawUrl = req.url ?? "/";
        const pathOnly = pathname(rawUrl);
        const method = req.method ?? "GET";
        const queryString = (() => {
          const q = rawUrl.indexOf("?");
          return q >= 0 ? rawUrl.slice(q + 1) : "";
        })();

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
          for (const u of list) {
            await handleUpdate(u).catch((err) => console.error("handleUpdate:", err));
          }
          res.writeHead(200);
          res.end();
          return;
        }

        if (await handlePayCheckoutHttp(method, pathOnly, queryString, res)) {
          return;
        }

        if (method === "POST" && pathOnly === "/webhooks/yookassa") {
          const raw = await readBody(req);
          let event: YooWebhookEvent;
          try {
            event = JSON.parse(raw) as YooWebhookEvent;
          } catch {
            res.writeHead(400);
            res.end();
            return;
          }
          if (
            dbEnabled() &&
            event.event === "payment.succeeded" &&
            event.object?.metadata &&
            event.object.id
          ) {
            const meta = event.object.metadata;
            const maxUserId = Number(meta.max_user_id);
            const plan = meta.plan ?? "";
            if (Number.isFinite(maxUserId) && maxUserId > 0 && isProPlanId(plan)) {
              try {
                const { expiresAt, alreadyProcessed } = await activatePro(
                  maxUserId,
                  plan,
                  "yookassa",
                  event.object.id,
                );
                if (!alreadyProcessed) {
                  await notifyProActivated(maxUserId, expiresAt).catch((err) =>
                    console.error("Notify user after YooKassa:", err),
                  );
                }
              } catch (err) {
                console.error("YooKassa activatePro:", err);
              }
            }
          }
          res.writeHead(200);
          res.end();
          return;
        }

        if (method === "GET" && pathOnly === "/api/me") {
          const q = new URL(rawUrl, "http://localhost").searchParams;
          const maxUserId = resolveMaxUserId(q, initDataHeader(req));
          if (maxUserId === null) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "missing or invalid auth" }));
            return;
          }
          try {
            await upsertBotUser(maxUserId, {});
            const user = await getBotUser(maxUserId);
            const tier =
              dbEnabled() && (await isProActive(maxUserId))
                ? "pro"
                : (user?.tier ?? "free");
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            });
            res.end(
              JSON.stringify({
                maxUserId,
                tier,
                language: user?.language ?? "ru",
                freeRecordLimit: config.freeRecordLimit,
                supabaseUrl: config.supabaseUrl || null,
                supabaseAnonKey: config.supabaseAnonKey || null,
              }),
            );
          } catch (err) {
            console.error("/api/me:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "profile_unavailable" }));
          }
          return;
        }

        if (method === "POST" && pathOnly === "/api/local-stats") {
          const q = new URL(rawUrl, "http://localhost").searchParams;
          const maxUserId = resolveMaxUserId(q, initDataHeader(req));
          if (maxUserId === null) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "missing or invalid auth" }));
            return;
          }
          const raw = await readBody(req);
          let clients = 0;
          try {
            const body = JSON.parse(raw) as { clients?: unknown };
            clients = Number(body.clients);
            if (!Number.isFinite(clients) || clients < 0) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "invalid clients" }));
              return;
            }
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "invalid json" }));
            return;
          }
          setLocalStats(maxUserId, clients);
          res.writeHead(204);
          res.end();
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
    console.log(
      `HTTP ${bind}:${config.httpPort} (Mini App, /webhooks/max, /webhooks/yookassa, /pay/*, /api/me)`,
    );
  });
}