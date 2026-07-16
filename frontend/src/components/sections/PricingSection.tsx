import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Clock, Heart, CalendarDays, Calendar } from "lucide-react";

const PRICING_CARDS = [
  {
    id: "trial",
    name: "Free",
    price: "$0",
    period: "1 free meal plan",
    description: "Try a full 7-day meal plan on us",
    features: [
      "AI ingredient recognition",
      "Step-by-step recipes",
      "One free 7-day meal plan",
      "Chronic condition meal planning",
      "Budget & location-based plans",
    ],
    cta: "Get Started",
    highlight: false,
    icon: Zap,
  },
  {
    id: "weekly",
    name: "1 Week",
    price: "$10",
    period: "per week",
    description: "Flexible short-term access",
    features: [
      "Everything in Free",
      "Unlimited meal plans",
      "Unlimited health meal generations",
      "Cancel anytime",
    ],
    cta: "Get Started",
    highlight: false,
    icon: Clock,
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
    cta: "Get Started",
    highlight: true,
    icon: Heart,
  },
  {
    id: "six_months",
    name: "6 Months",
    price: "$120",
    period: "per 6 months",
    description: "Commit for half a year — better value",
    features: [
      "Everything in Monthly",
      "Unlimited meal plans",
      "Priority support",
      "Advanced health tracking",
    ],
    cta: "Get Started",
    highlight: false,
    icon: CalendarDays,
  },
  {
    id: "yearly",
    name: "1 Year",
    price: "$240",
    period: "per year",
    description: "Best value — a full year of access",
    features: [
      "Everything in Monthly",
      "Best long-term value",
      "Priority support",
      "Advanced health tracking",
    ],
    cta: "Get Started",
    highlight: false,
    icon: Calendar,
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-normal mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Get one free 7-day meal plan when you sign up. Then choose a plan that fits — from $10/week to $240/year. One payment unlocks Cooking and Health features.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {PRICING_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className={`relative rounded-xl border bg-card p-6 sm:p-8 flex flex-col ${card.highlight
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "border-border"
                  }`}
              >
                {card.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Most popular
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">{card.name}</h3>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold">{card.price}</span>
                  <span className="text-muted-foreground ml-1">{card.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{card.description}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {card.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
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
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          No credit card required for your free meal plan. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
