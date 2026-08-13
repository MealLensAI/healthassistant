import { useEffect, useState } from 'react';
import {
  fetchLocalizedPricing,
  getCachedLocalizedPricing,
  LocalizedPlan,
  LocalizedPricing,
} from '@/lib/geoPricing';

export function useLocalizedPricing() {
  const cached = typeof window !== 'undefined' ? getCachedLocalizedPricing() : null;
  const [pricing, setPricing] = useState<LocalizedPricing | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    fetchLocalizedPricing()
      .then((data) => {
        if (!cancelled) setPricing(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plans: LocalizedPlan[] = pricing?.plans ?? [];
  const monthly = plans.find((plan) => plan.id === 'monthly');

  return {
    pricing,
    plans,
    isLoading,
    currency: pricing?.currency ?? 'USD',
    symbol: pricing?.symbol ?? '$',
    countryName: pricing?.country_name ?? 'United States',
    usedFallback: pricing?.used_fallback ?? true,
    monthlyPriceLabel: monthly?.formatted_price ?? '$20',
  };
}
