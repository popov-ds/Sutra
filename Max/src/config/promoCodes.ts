export type PromoCodeDef = {
  code: string;
  days: number;
  maxUses: number | null;
};

/** PROMO_CODES=BETA30:30,WELCOME14:14:50 — код:дни[:макс_активаций_всего] */
export function parsePromoCodesEnv(raw: string): PromoCodeDef[] {
  const out: PromoCodeDef[] = [];
  for (const chunk of raw.split(",")) {
    const part = chunk.trim();
    if (!part) continue;
    const segs = part.split(":").map((s) => s.trim());
    const code = segs[0]?.toUpperCase();
    if (!code) continue;
    const days = Number(segs[1]);
    if (!Number.isFinite(days) || days <= 0) continue;
    let maxUses: number | null = null;
    if (segs[2] !== undefined && segs[2] !== "") {
      const m = Number(segs[2]);
      if (Number.isFinite(m) && m > 0) maxUses = Math.floor(m);
    }
    out.push({ code, days, maxUses });
  }
  return out;
}