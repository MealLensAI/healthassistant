




// Centralized configuration for MealLens AI
export const APP_CONFIG = {
    // App Information
    name: 'MealLens AI',
    description: 'Your AI-powered kitchen assistant',
    version: '1.0.0',

    // Brand Colors
    colors: {
        primary: '#FF6B35', // Orange
        secondary: '#1A1A1A', // Black
        accent: '#FFFFFF', // White
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
    },

    // Subscription Plans
    subscriptionPlans: [
        {
            id: 'free',
            name: 'free',
            display_name: '1 Month Free Trial',
            price_weekly: 0,
            price_two_weeks: 0,
            price_monthly: 0,
            currency: 'USD',
            features: [
                'Health-Focused Meal Plans',
                'Personalized Meal Plans for Chronic Conditions',
                'BMI & BMR Calculations',
                'Health Condition Management',
                'Nutritional Tracking',
                'Full History Access'
            ],
            limits: {
                health_meal_plans_per_month: 3,
                health_meal_generations: 5
            },
            is_active: true,
            duration_days: 7,
            billing_cycle: 'weekly'
        },
        {
            id: 'weekly',
            name: 'weekly',
            display_name: 'Weekly Plan',
            price_weekly: 1.25,
            price_two_weeks: 2.50,
            price_monthly: 5.00,
            currency: 'USD',
            features: [
                'Smart Ingredient Recognition',
                'Recipe Suggestions & Cooking Instructions',
                'Smart Food Detection',
                'AI Meal Planning',
                'AI Meal Plan for Chronic Sickness',
                'Budget & Location Based Meal Plans',
                'Full History Access'
            ],
            limits: {
                health_meal_plans_per_month: -1,
                health_meal_generations: -1
            },
            is_active: true,
            duration_days: 7,
            billing_cycle: 'weekly'
        },
        {
            id: 'two_weeks',
            name: 'two_weeks',
            display_name: 'Two Weeks Plan',
            price_weekly: 1.25,
            price_two_weeks: 2.50,
            price_monthly: 5.00,
            currency: 'USD',
            features: [
                'Smart Ingredient Recognition',
                'Recipe Suggestions & Cooking Instructions',
                'Smart Food Detection',
                'AI Meal Planning',
                'AI Meal Plan for Chronic Sickness',
                'Budget & Location Based Meal Plans',
                'Full History Access'
            ],
            limits: {
                health_meal_plans_per_month: -1,
                health_meal_generations: -1
            },
            is_active: true,
            duration_days: 14,
            billing_cycle: 'two_weeks'
        },
        {
            id: 'monthly',
            name: 'monthly',
            display_name: 'Monthly Plan',
            price_weekly: 1.25,
            price_two_weeks: 2.50,
            price_monthly: 5.00,
            currency: 'USD',
            features: [
                'Smart Ingredient Recognition',
                'Recipe Suggestions & Cooking Instructions',
                'Smart Food Detection',
                'AI Meal Planning',
                'AI Meal Plan for Chronic Sickness',
                'Budget & Location Based Meal Plans',
                'Full History Access',
                'Priority Support',
                'Advanced Health Tracking'
            ],
            limits: {
                health_meal_plans_per_month: -1,
                health_meal_generations: -1
            },
            is_active: true,
            duration_days: 30,
            billing_cycle: 'monthly'
        },
        {
            id: 'yearly',
            name: 'yearly',
            display_name: 'Yearly Plan',
            price_weekly: 1.25,
            price_two_weeks: 2.50,
            price_monthly: 5.00,
            price_yearly: 50.00,
            currency: 'USD',
            features: [
                'Smart Ingredient Recognition',
                'Recipe Suggestions & Cooking Instructions',
                'Smart Food Detection',
                'AI Meal Planning',
                'AI Meal Plan for Chronic Sickness',
                'Budget & Location Based Meal Plans',
                'Full History Access',
                'Priority Support',
                'Advanced Health Tracking'
            ],
            limits: {
                health_meal_plans_per_month: -1,
                health_meal_generations: -1
            },
            is_active: true,
            duration_days: 366,
            billing_cycle: 'yearly'
        }

    ],

    // Features
    features: {
        health_meal_planning: {
            name: 'Health Meal Planning',
            description: 'Personalized meal plans for your health condition',
            icon: 'Heart',
            trial_limit: 3
        },
        health_meal_generation: {
            name: 'Health Meal Generator',
            description: 'Generate health-focused meals from ingredients',
            icon: 'Stethoscope',
            trial_limit: 5
        },
        meal_planning: {
            name: 'Meal Planning',
            description: 'Create personalized meal plans',
            icon: 'Calendar',
            trial_limit: 3
        },
        history: {
            name: 'History',
            description: 'Track your food discoveries and recipes',
            icon: 'History',
            trial_limit: -1 // Unlimited during trial
        }
    },

    // Trial Configuration
    trial: {
        duration_days: 7, // 7-day free trial as required
        features_unlocked: true
    },

    // API Configuration
    api: {
        // Backend API URL - defaults to empty string for local development (uses Vite proxy)
        // Set VITE_API_URL="https://meallensai.onrender.com" in .env for production
        base_url: (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL !== undefined) 
                  ? (import.meta as any).env.VITE_API_URL 
                  : '',
        // AI API URL - defaults to production AI server
        ai_api_url: (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_AI_API_URL) || 'https://api.meallensai.com/7017',
        timeout: 30000
    },

    // Payment Providers Configuration
    paymentProviders: {
        paystack: {
            name: 'Paystack',
            public_key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_...',
            currencies: ['NGN', 'USD', 'GHS', 'ZAR', 'KES', 'UGX', 'TZS', 'XOF', 'XAF', 'EGP'],
            regions: ['Nigeria', 'Ghana', 'South Africa', 'Kenya', 'Uganda', 'Tanzania', 'West Africa', 'Central Africa', 'Egypt'],
            features: ['Card Payments', 'Bank Transfers', 'Mobile Money (M-Pesa)', 'USSD', 'QR Payments'],
            icon: 'CreditCard',
            is_available: true,
            description: 'Unified payment platform with M-Pesa and mobile money support',
            payment_methods: {
                KES: {
                    mobile_money: {
                        name: 'M-Pesa',
                        description: 'Pay with M-Pesa mobile money',
                        icon: 'Smartphone',
                        instructions: 'You will receive an M-Pesa prompt on your phone'
                    },
                    card: {
                        name: 'Card Payment',
                        description: 'Pay with Visa, Mastercard, or Verve',
                        icon: 'CreditCard'
                    },
                    bank: {
                        name: 'Bank Transfer',
                        description: 'Pay directly from your bank account',
                        icon: 'Building'
                    },
                    ussd: {
                        name: 'USSD',
                        description: 'Pay using USSD code *996#',
                        icon: 'Phone'
                    }
                },
                NGN: {
                    card: {
                        name: 'Card Payment',
                        description: 'Pay with Visa, Mastercard, or Verve',
                        icon: 'CreditCard'
                    },
                    bank: {
                        name: 'Bank Transfer',
                        description: 'Pay directly from your bank account',
                        icon: 'Building'
                    },
                    ussd: {
                        name: 'USSD',
                        description: 'Pay using USSD code *996#',
                        icon: 'Phone'
                    }
                },
                GHS: {
                    mobile_money: {
                        name: 'Mobile Money',
                        description: 'Pay with MTN Mobile Money or Vodafone Cash',
                        icon: 'Smartphone'
                    },
                    card: {
                        name: 'Card Payment',
                        description: 'Pay with Visa or Mastercard',
                        icon: 'CreditCard'
                    },
                    bank: {
                        name: 'Bank Transfer',
                        description: 'Pay directly from your bank account',
                        icon: 'Building'
                    }
                }
            }
        },
        mpesa: {
            name: 'M-Pesa (Direct)',
            currencies: ['KES'],
            regions: ['Kenya', 'Tanzania', 'Uganda', 'Mozambique', 'Lesotho', 'Ghana', 'Egypt'],
            features: ['Mobile Money', 'SMS Payments', 'USSD'],
            icon: 'Smartphone',
            is_available: false,  // Disable direct M-Pesa - use Paystack instead
            description: 'Direct Safaricom M-Pesa integration'
        },
        stripe: {
            name: 'Stripe',
            public_key: import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_...',
            currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK'],
            regions: ['Global'],
            features: ['Card Payments', 'Digital Wallets', 'Bank Transfers', 'Buy Now Pay Later'],
            icon: 'CreditCard',
            is_available: false,  // Disable Stripe - only use Paystack
            description: 'Global payment processing'
        }
    },

    // Paystack Configuration (for backward compatibility)
    paystack: {
        public_key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_...',
        currency: 'USD'
    },

    // Currency Configuration
    currencies: [
        { code: 'USD', symbol: '$', name: 'US Dollar', exchange_rate: 1.0 },
        { code: 'EUR', symbol: '€', name: 'Euro', exchange_rate: 0.85 },
        { code: 'GBP', symbol: '£', name: 'British Pound', exchange_rate: 0.73 },
        { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', exchange_rate: 1500.0 },
        { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', exchange_rate: 12.0 },
        { code: 'ZAR', symbol: 'R', name: 'South African Rand', exchange_rate: 18.0 },
        { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', exchange_rate: 150.0 },
        { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', exchange_rate: 3700.0 },
        { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', exchange_rate: 2500.0 },
        { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', exchange_rate: 600.0 },
        { code: 'XAF', symbol: 'CFA', name: 'Central African CFA Franc', exchange_rate: 600.0 },
        { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', exchange_rate: 30.0 },
        { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', exchange_rate: 1.35 },
        { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', exchange_rate: 1.50 },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen', exchange_rate: 150.0 },
        { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', exchange_rate: 0.88 },
        { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', exchange_rate: 10.5 },
        { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', exchange_rate: 10.8 },
        { code: 'DKK', symbol: 'kr', name: 'Danish Krone', exchange_rate: 6.9 }
    ]
};

// Helper Functions
export const getPlanPrice = (planName: string, billingCycle: string): number => {
    const plan = APP_CONFIG.subscriptionPlans.find(p => p.name === planName);
    if (!plan) return 0;

    switch (billingCycle) {
        case 'weekly':
            return plan.price_weekly;
        case 'two_weeks':
            return plan.price_two_weeks;
        case 'monthly':
            return plan.price_monthly;
        case 'yearly':
            return plan.price_yearly || 50.00;
        default:
            return plan.price_monthly;
    }
};

export const getPlanDisplayName = (planName: string): string => {
    const plan = APP_CONFIG.subscriptionPlans.find(p => p.name === planName);
    return plan?.display_name || planName;
};

export const getPlanDurationText = (billingCycle: string): string => {
    switch (billingCycle) {
        case 'weekly':
            return 'per week';
        case 'two_weeks':
            return 'per 2 weeks';
        case 'monthly':
            return 'per month';
        case 'yearly':
            return 'per year';
        default:
            return 'per month';
    }
};

export const getPlanFeatures = (planName: string): string[] => {
    const plan = APP_CONFIG.subscriptionPlans.find(p => p.name === planName);
    return plan?.features || [];
};

export const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = APP_CONFIG.currencies.find(c => c.code === fromCurrency)?.exchange_rate || 1;
    const toRate = APP_CONFIG.currencies.find(c => c.code === toCurrency)?.exchange_rate || 1;

    return (amount / fromRate) * toRate;
};

export const formatCurrency = (amount: number, currency: string): string => {
    const currencyInfo = APP_CONFIG.currencies.find(c => c.code === currency);
    if (!currencyInfo) return `${amount.toFixed(2)} ${currency}`;

    return `${currencyInfo.symbol}${amount.toFixed(2)}`;
};

export const getCurrencyInfo = (currency: string) => {
    return APP_CONFIG.currencies.find(c => c.code === currency);
};

// Payment Provider Helpers
export const getAvailableProviders = () => {
    return Object.entries(APP_CONFIG.paymentProviders)
        .filter(([_, provider]) => provider.is_available)
        .reduce((acc, [key, provider]) => {
            acc[key] = provider;
            return acc;
        }, {} as Record<string, any>);
};

export const getProvidersForCurrency = (currency: string) => {
    const availableProviders = getAvailableProviders();
    return Object.entries(availableProviders)
        .filter(([_, provider]) => provider.currencies.includes(currency))
        .reduce((acc, [key, provider]) => {
            acc[key] = provider;
            return acc;
        }, {} as Record<string, any>);
};

export const getBestProviderForCurrency = (_currency: string): string | null => {
    // Force Paystack for all currencies - only provider we support
    return 'paystack';
};
