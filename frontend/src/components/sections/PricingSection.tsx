import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useLocalizedPricing } from "@/hooks/useLocalizedPricing";

const PRICING_FEATURES: Record<string, { features: string[]; cta: string }> = {
  trial: {
    features: [
      "AI ingredient recognition",
      "Step-by-step recipes",
      "One free 7-day meal plan",
      "Chronic condition meal planning",
      "Budget & location-based plans",
    ],
    cta: "Start free",
  },
  monthly: {
    features: [
      "Everything in Free",
      "Unlimited meal plans",
      "Unlimited health meal generations",
      "Priority support",
      "Cancel anytime",
    ],
    cta: "Get started",
  },
  six_months: {
    features: [
      "Everything in Monthly",
      "Unlimited meal plans",
      "Priority support",
      "Advanced health tracking",
    ],
    cta: "Get started",
  },
  yearly: {
    features: [
      "Everything in Monthly",
      "Best long-term value",
      "Priority support",
      "Advanced health tracking",
    ],
    cta: "Get started",
  },
};

const PricingSection = () => {
  const navigate = useNavigate();
  const { pricing, plans, isLoading, countryName, usedFallback, monthlyPriceLabel } =
    useLocalizedPricing();

  const cards = [
    {
      id: "trial",
      name: pricing?.free_plan.name ?? "Free",
      price: pricing?.free_plan.formatted_price ?? "$0",
      period: pricing?.free_plan.period ?? "1 free meal plan",
      description: "Try a full 7-day meal plan on us",
      highlight: false,
      ...PRICING_FEATURES.trial,
    },
    ...plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.formatted_price,
      period: plan.period,
      description: plan.description,
      highlight: plan.highlight,
      ...PRICING_FEATURES[plan.id],
    })),
  ];

  return (
    <section id="pricing" className="py-24 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf mb-4">
            Pricing
          </p>
          <h2 className="font-display text-3xl lg:text-5xl tracking-tight mb-5">
            Simple pricing. One subscription.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Get one free 7-day meal plan when you sign up. Then choose a plan
            that fits, with cooking and health features included.
          </p>
          {pricing && (
            <p className="text-sm text-muted-foreground mt-3">
              {usedFallback
                ? `Prices shown in ${pricing.currency_name} (${pricing.currency}).`
                : `Prices shown in ${pricing.currency_name} for ${countryName}.`}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {(isLoading ? [0, 1, 2, 3] : cards).map((card, index) => {
            if (isLoading) {
              return (
                <div
                  key={index}
                  className="relative rounded-2xl border border-border bg-card p-6 flex flex-col animate-pulse"
                >
                  <div className="h-6 w-24 bg-muted rounded mb-4" />
                  <div className="h-9 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-28 bg-muted rounded mb-6" />
                  <div className="space-y-3 mb-8 flex-1">
                    {[0, 1, 2, 3].map((line) => (
                      <div key={line} className="h-4 w-full bg-muted rounded" />
                    ))}
                  </div>
                  <div className="h-10 w-full bg-muted rounded" />
                </div>
              );
            }

            const item = card as (typeof cards)[number];
            return (
              <div
                key={item.id}
                className={`relative rounded-2xl border bg-card p-6 flex flex-col ${
                  item.highlight
                    ? "border-primary shadow-card ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                {item.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    Most popular
                  </div>
                )}
                <h3 className="font-display text-xl tracking-tight mb-3">
                  {item.name}
                </h3>
                <div className="mb-2">
                  <span className="text-3xl font-bold tracking-tight">
                    {item.price}
                  </span>
                  <span className="text-muted-foreground ml-1 text-sm">
                    {item.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {item.description}
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-leaf flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={item.highlight ? "default" : "outline"}
                  className="w-full"
                  onClick={() => navigate("/signup")}
                >
                  {item.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          No credit card required for your free meal plan. Cancel anytime.
          Paid plans start at {monthlyPriceLabel}/month.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
