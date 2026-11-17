import type { RuStoreProduct } from '@/billing/ruStoreApi';
import { getRuStoreProPlanFallbackPrices } from '@/billing/config';

export function formatRuStorePlanPriceLabel(product: RuStoreProduct | undefined, fallbackRub: number): string {
  if (product?.price != null && product.price > 0) {
    return `${Math.round(product.price / 100)} р.`;
  }
  if (product?.amountLabel?.trim()) {
    const digits = product.amountLabel.replace(/[^\d]/g, '');
    if (digits) return `${digits} р.`;
  }
  return `${fallbackRub} р.`;
}

export function defaultPlanFallbackRub(productId: 'pro_month' | 'pro_year'): number {
  const prices = getRuStoreProPlanFallbackPrices();
  return productId === 'pro_month' ? prices.month : prices.year;
}