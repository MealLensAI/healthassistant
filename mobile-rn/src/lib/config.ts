import Constants from 'expo-constants';

type ExtraConfig = {
  apiBaseUrl?: string;
  aiApiUrl?: string;
  imageSearchUrl?: string;
};

const extra =
  (Constants?.expoConfig?.extra as ExtraConfig | undefined) ||
  ((Constants as any)?.manifest2?.extra?.expoClient?.extra as ExtraConfig | undefined) ||
  {};

export const APP_CONFIG = {
  name: 'MealLens AI',
  description: 'Your AI-powered kitchen assistant',
  version: '1.0.0',

  api: {
    base_url: extra.apiBaseUrl || 'https://api.meallensai.com/5001',
    ai_api_url: extra.aiApiUrl || 'https://api.meallensai.com/7017',
    image_search_url: extra.imageSearchUrl || 'https://get-images-qa23.onrender.com',
    timeout: 30000,
  },

  trial: {
    duration_days: 7,
  },

  subscriptionPlans: [
    {
      id: 'free',
      name: 'free',
      display_name: '1 Month Free Trial',
      price_weekly: 0,
      price_two_weeks: 0,
      price_monthly: 0,
      currency: 'USD',
      duration_days: 7,
      billing_cycle: 'weekly',
      features: [
        'Health-Focused Meal Plans',
        'Personalized Meal Plans for Chronic Conditions',
        'BMI & BMR Calculations',
        'Health Condition Management',
        'Nutritional Tracking',
        'Full History Access',
      ],
    },
    {
      id: 'weekly',
      name: 'weekly',
      display_name: 'Weekly Plan',
      price_weekly: 1.25,
      price_two_weeks: 2.5,
      price_monthly: 5.0,
      currency: 'USD',
      duration_days: 7,
      billing_cycle: 'weekly',
      features: [
        'Smart Ingredient Recognition',
        'Recipe Suggestions & Cooking Instructions',
        'Smart Food Detection',
        'AI Meal Planning',
        'AI Meal Plan for Chronic Sickness',
        'Budget & Location Based Meal Plans',
        'Full History Access',
      ],
    },
    {
      id: 'two_weeks',
      name: 'two_weeks',
      display_name: 'Two Weeks Plan',
      price_weekly: 1.25,
      price_two_weeks: 2.5,
      price_monthly: 5.0,
      currency: 'USD',
      duration_days: 14,
      billing_cycle: 'two_weeks',
      features: [
        'Smart Ingredient Recognition',
        'Recipe Suggestions & Cooking Instructions',
        'Smart Food Detection',
        'AI Meal Planning',
        'AI Meal Plan for Chronic Sickness',
        'Budget & Location Based Meal Plans',
        'Full History Access',
      ],
    },
    {
      id: 'monthly',
      name: 'monthly',
      display_name: 'Monthly Plan',
      price_weekly: 1.25,
      price_two_weeks: 2.5,
      price_monthly: 5.0,
      currency: 'USD',
      duration_days: 30,
      billing_cycle: 'monthly',
      features: [
        'Smart Ingredient Recognition',
        'Recipe Suggestions & Cooking Instructions',
        'Smart Food Detection',
        'AI Meal Planning',
        'AI Meal Plan for Chronic Sickness',
        'Budget & Location Based Meal Plans',
        'Full History Access',
        'Priority Support',
        'Advanced Health Tracking',
      ],
    },
    {
      id: 'yearly',
      name: 'yearly',
      display_name: 'Yearly Plan',
      price_weekly: 1.25,
      price_two_weeks: 2.5,
      price_monthly: 5.0,
      price_yearly: 50.0,
      currency: 'USD',
      duration_days: 366,
      billing_cycle: 'yearly',
      features: [
        'Smart Ingredient Recognition',
        'Recipe Suggestions & Cooking Instructions',
        'Smart Food Detection',
        'AI Meal Planning',
        'AI Meal Plan for Chronic Sickness',
        'Budget & Location Based Meal Plans',
        'Full History Access',
        'Priority Support',
        'Advanced Health Tracking',
      ],
    },
  ] as Array<{
    id: string;
    name: string;
    display_name: string;
    price_weekly: number;
    price_two_weeks: number;
    price_monthly: number;
    price_yearly?: number;
    currency: string;
    duration_days: number;
    billing_cycle: string;
    features: string[];
  }>,
};

export const getPlanPrice = (planName: string, billingCycle: string): number => {
  const plan = APP_CONFIG.subscriptionPlans.find((p) => p.name === planName);
  if (!plan) return 0;
  switch (billingCycle) {
    case 'weekly':
      return plan.price_weekly;
    case 'two_weeks':
      return plan.price_two_weeks;
    case 'monthly':
      return plan.price_monthly;
    case 'yearly':
      return plan.price_yearly || 50;
    default:
      return plan.price_monthly;
  }
};
