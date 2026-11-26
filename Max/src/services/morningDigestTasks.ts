import type { AppLanguage } from "../bot/i18n.js";
import type { DigestTask } from "../domain/morningDigest.js";
import { localizedTaskTitle } from "../domain/taskTitles.js";
import { getSupabaseAdmin } from "./supabaseAdmin.js";

type TaskRow = {
  id: string;
  client_id: string;
  purchase_id: string | null;
  type: string;
  title: string;
  touch_on: string;
};

export async function markOverdueInCloud(supabaseUserId: string, today: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "overdue", updated_at: now })
    .eq("user_id", supabaseUserId)
    .eq("status", "pending")
    .lt("touch_on", today)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
}

export async function loadDigestTasksForDay(
  supabaseUserId: string,
  day: string,
  lang: AppLanguage,
): Promise<DigestTask[]> {
  const supabase = getSupabaseAdmin();

  const { data: tasks, error: taskErr } = await supabase
    .from("tasks")
    .select("id, client_id, purchase_id, type, title, touch_on")
    .eq("user_id", supabaseUserId)
    .eq("touch_on", day)
    .neq("status", "done")
    .is("deleted_at", null)
    .order("touch_on")
    .order("title");
  if (taskErr) throw new Error(taskErr.message);
  const rows = (tasks ?? []) as TaskRow[];
  if (rows.length === 0) return [];

  const clientIds = [...new Set(rows.map((r) => r.client_id))];
  const purchaseIds = [...new Set(rows.map((r) => r.purchase_id).filter(Boolean))] as string[];

  const { data: clients, error: clientErr } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", supabaseUserId)
    .in("id", clientIds)
    .is("deleted_at", null);
  if (clientErr) throw new Error(clientErr.message);

  const clientMap = new Map((clients ?? []).map((c) => [String(c.id), String(c.name)]));

  const productByPurchase = new Map<string, string>();
  if (purchaseIds.length > 0) {
    const { data: purchases, error: puErr } = await supabase
      .from("purchases")
      .select("id, product_id")
      .eq("user_id", supabaseUserId)
      .in("id", purchaseIds)
      .is("deleted_at", null);
    if (puErr) throw new Error(puErr.message);
    const productIds = [...new Set((purchases ?? []).map((p) => String(p.product_id)))];
    if (productIds.length > 0) {
      const { data: products, error: prErr } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", supabaseUserId)
        .in("id", productIds)
        .is("deleted_at", null);
      if (prErr) throw new Error(prErr.message);
      const productMap = new Map((products ?? []).map((p) => [String(p.id), String(p.name)]));
      for (const pu of purchases ?? []) {
        const name = productMap.get(String(pu.product_id));
        if (name) productByPurchase.set(String(pu.id), name);
      }
    }
  }

  return rows.map((row) => ({
    clientName: clientMap.get(row.client_id) ?? "—",
    title: localizedTaskTitle(row.type, lang, row.title),
    productName: row.purchase_id ? productByPurchase.get(row.purchase_id) ?? null : null,
    type: row.type,
  }));
}