export type ProPlanId = "pro_month" | "pro_year";

export const PLAN_DAYS: Record<ProPlanId, number> = {
  pro_month: 30,
  pro_year: 365,
};

export function isProPlanId(v: string): v is ProPlanId {
  return v === "pro_month" || v === "pro_year";
}