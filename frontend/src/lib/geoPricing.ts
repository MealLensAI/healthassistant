import { api } from '@/lib/api';

export interface LocalizedPlan {
  id: string;
  name: string;
  label: string;
  period: string;
  description: string;
  price: number;
  paystack_amount: number;
  currency: string;
  symbol: string;
  formatted_price: string;
  duration_minutes: number;
  highlight: boolean;
}

export interface LocalizedPricing {
  country_code: string;
  country_name: string;
  currency: string;
  symbol: string;
  currency_name: string;
  used_fallback: boolean;
  fallback_country_code: string;
  detected_country_code?: string | null;
  ip_private?: boolean;
  plans: LocalizedPlan[];
  free_plan: {
    id: string;
    name: string;
    formatted_price: string;
    price: number;
    currency: string;
    symbol: string;
    period: string;
  };
}

const CACHE_KEY = 'meallensai_localized_pricing';
const CACHE_TTL_MS = 30 * 60 * 1000;

const USD_FALLBACK: LocalizedPricing = {
  country_code: 'US',
  country_name: 'United States',
  currency: 'USD',
  symbol: '$',
  currency_name: 'US Dollar',
  used_fallback: true,
  fallback_country_code: 'US',
  plans: [
    {
      id: 'monthly',
      name: '1 Month',
      label: '$20 Monthly',
      period: 'per month',
      description: 'Best for building a lasting habit',
      price: 20,
      paystack_amount: 20,
      currency: 'USD',
      symbol: '$',
      formatted_price: '$20',
      duration_minutes: 43200,
      highlight: false,
    },
    {
      id: 'six_months',
      name: '6 Months',
      label: '$120 Six Months',
      period: 'per 6 months',
      description: 'Commit for half a year. Better value.',
      price: 120,
      paystack_amount: 120,
      currency: 'USD',
      symbol: '$',
      formatted_price: '$120',
      duration_minutes: 259200,
      highlight: true,
    },
    {
      id: 'yearly',
      name: '1 Year',
      label: '$240 Yearly',
      period: 'per year',
      description: 'Best value. A full year of access.',
      price: 240,
      paystack_amount: 240,
      currency: 'USD',
      symbol: '$',
      formatted_price: '$240',
      duration_minutes: 525600,
      highlight: false,
    },
  ],
  free_plan: {
    id: 'trial',
    name: 'Free',
    formatted_price: '$0',
    price: 0,
    currency: 'USD',
    symbol: '$',
    period: '1 free meal plan',
  },
};

function readCache(): LocalizedPricing | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: LocalizedPricing };
    if (!parsed?.data?.plans?.length) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: LocalizedPricing) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // ignore quota / private mode
  }
}

async function detectBrowserCountry(): Promise<string | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const code = (data?.country_code || '').toString().toUpperCase();
    return code.length === 2 ? code : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function getCachedLocalizedPricing(): LocalizedPricing | null {
  return readCache();
}

export async function fetchLocalizedPricing(): Promise<LocalizedPricing> {
  const cached = readCache();
  if (cached) return cached;

  const loadFromApi = async (country?: string): Promise<LocalizedPricing | null> => {
    const query = country ? `?country=${encodeURIComponent(country)}` : '';
    const result = await api.getLocalizedPlans(query);
    if (result?.status === 'success' && Array.isArray(result.plans) && result.plans.length > 0) {
      return result as LocalizedPricing;
    }
    return null;
  };

  try {
    let pricing = await loadFromApi();

    // Local/dev: backend often sees 127.0.0.1, so detect the real country in the browser.
    if (pricing?.ip_private) {
      const browserCountry = await detectBrowserCountry();
      if (browserCountry) {
        const hinted = await loadFromApi(browserCountry);
        if (hinted) pricing = hinted;
      }
    }

    if (pricing) {
      writeCache(pricing);
      return pricing;
    }
  } catch (error) {
    console.warn('Localized pricing lookup failed, using default currency:', error);
  }

  return USD_FALLBACK;
}
