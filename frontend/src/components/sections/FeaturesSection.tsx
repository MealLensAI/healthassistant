import { UtensilsCrossed, ScanLine, CalendarDays, Wallet, ChefHat } from "lucide-react";

const FEATURES = [
  {
    icon: UtensilsCrossed,
    title: "Food for you",
    description:
      "The first place to look when you have a chronic condition and need to know what to eat. Get meals that support your health — wherever you are — ready to cook.",
  },
  {
    icon: ScanLine,
    title: "Scan ingredients",
    description:
      "Snap a photo of your fridge or ingredients and get meal ideas with cooking instructions you can actually follow.",
  },
  {
    icon: CalendarDays,
    title: "Weekly meal plans",
    description:
      "Generate condition-friendly plans by scanning or typing ingredients, or auto-generate from your health profile, complete with cooking instructions.",
  },
  {
    icon: Wallet,
    title: "Budget & location",
    description:
      "Enter your budget and location to get meal plans that fit both, so eating right stays realistic for your life.",
  },
  {
    icon: ChefHat,
    title: "Cook with guidance",
    description:
      "Get clear cooking instructions for every personalized recipe, so healthy meals feel doable on busy days.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 lg:py-28 bg-secondary/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf mb-4">
            What you get
          </p>
          <h2 className="font-display text-3xl lg:text-5xl tracking-tight mb-5">
            Everything you need to eat right, without the overwhelm
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Start with Food for you when you need meals that fit your
            condition. Then scan, plan, and cook in one place — built so
            managing health through food feels easy.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-14">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-leaf-soft text-leaf flex items-center justify-center">
                <feature.icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-xl tracking-tight mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
