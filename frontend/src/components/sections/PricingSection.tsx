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
      "3 free 7-day meal plans",
      "Ingredient scanning",
      "Food detection and recipes",
      "Chronic condition meal planning",
    ],
    cta: "Start free",
    highlight: false,
    badge: "",
  },
  {
    id: "bronze",
    name: "Bronze",
    price: "$10",
    period: "per month",
    description: "AI meal tools only. No marketplace dietitian.",
    features: [
      "Unlimited ingredient scanning",
      "Food detection and recipes",
      "AI meal planning",
      "Location and budget plans",
      "Health information and history",
    ],
    cta: "Choose Bronze",
    highlight: false,
    badge: "AI only",
  },
  {
    id: "silver",
    name: "Silver",
    price: "$20",
    period: "per month",
    description: "AI tools plus one dietitian, with 3 appointments.",
    features: [
      "Everything in Bronze",
      "Marketplace dietitian access",
      "1 dietitian at a time",
      "1 consultation + 2 follow-ups",
      "Pick a date and time on the calendar",
    ],
    cta: "Choose Silver",
    highlight: false,
    badge: "",
  },
  {
    id: "gold",
    name: "Gold",
    price: "$50",
    original: "$60",
    period: "per 3 months",
    description: "Three months of care. 7 appointments, 20% off.",
    features: [
      "Everything in Silver",
      "1 consultation + 6 follow-ups",
      "Pick dates and times for every visit",
      "3 months of marketplace access",
      "20% off vs 3 months of Silver",
    ],
    cta: "Choose Gold",
    highlight: true,
    badge: "20% off",
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
            Three packages. Clear differences.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Bronze is AI meal tools. Silver and Gold add a marketplace dietitian,
            with a calendar so you can set the date and time for each follow-up.
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
                  Best value
                </div>
              )}
              {card.badge && !card.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-secondary text-foreground text-xs font-medium">
                  {card.badge}
                </div>
              ) : null}
              {card.highlight && card.badge ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  {card.badge}
                </p>
              ) : null}
              <h3 className="font-display text-xl tracking-tight mb-3">
                {card.name}
              </h3>
              <div className="mb-2">
                {"original" in card && card.original ? (
                  <span className="mr-2 text-sm text-muted-foreground line-through">
                    {card.original}
                  </span>
                ) : null}
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
          No credit card required for your free meal plans. Dietitian invites and
          organization accounts stay separate from these packages.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
