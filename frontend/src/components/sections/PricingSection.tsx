import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const PRICING_CARDS = [
  {
    id: "trial",
    name: "Free",
    price: "$0",
    period: "3 free meal plans",
    description: "Try full 7-day meal plans on us",
    features: [
      "Free unlimited AI ingredient scanning/recognition",
      "Free unlimited step-by-step cooking recipe instructions",
      "3 free 7-day meal plans",
      "3 free budget and location meal plan generations",
      "Chronic condition meal planning",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    id: "monthly",
    name: "1 Month",
    price: "$20",
    period: "per month",
    description: "Best for building a lasting habit",
    features: [
      "Everything in Free",
      "Unlimited meal plans",
      "Unlimited health meal generations",
      "Priority support",
      "Cancel anytime",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    id: "six_months",
    name: "6 Months",
    price: "$120",
    period: "per 6 months",
    description: "Commit for half a year. Better value.",
    features: [
      "Everything in Monthly",
      "Unlimited meal plans",
      "Priority support",
      "Advanced health tracking",
    ],
    cta: "Get started",
    highlight: true,
  },
  {
    id: "yearly",
    name: "1 Year",
    price: "$240",
    period: "per year",
    description: "Best value. A full year of access.",
    features: [
      "Everything in Monthly",
      "Best long-term value",
      "Priority support",
      "Advanced health tracking",
    ],
    cta: "Get started",
    highlight: false,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

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
            Get three free 7-day meal plans when you sign up. Then choose a plan
            that fits, with cooking and health features included.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {PRICING_CARDS.map((card) => (
            <div
              key={card.id}
              className={`relative rounded-2xl border bg-card p-6 flex flex-col ${
                card.highlight
                  ? "border-primary shadow-card ring-1 ring-primary/20"
                  : "border-border"
              }`}
            >
              {card.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  Most popular
                </div>
              )}
              <h3 className="font-display text-xl tracking-tight mb-3">
                {card.name}
              </h3>
              <div className="mb-2">
                <span className="text-3xl font-bold tracking-tight">
                  {card.price}
                </span>
                <span className="text-muted-foreground ml-1 text-sm">
                  {card.period}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {card.description}
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-leaf flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={card.highlight ? "default" : "outline"}
                className="w-full"
                onClick={() => navigate("/signup")}
              >
                {card.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          No credit card required for your free meal plans. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
