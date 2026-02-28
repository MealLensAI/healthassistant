import { UtensilsCrossed, Brain, BarChart3, Bell, Target, ChefHat, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  {
    icon: Brain,
    title: "AI-powered meal plans",
    description: "Tell our AI your condition and health data. Get personalized meal plans designed to support, restore, or improve your health.",
    color: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: UtensilsCrossed,
    title: "Condition-specific food",
    description: "Recommendations tailored to diabetes, hypertension, obesity, heart disease, kidney care, and many more.",
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
  },
  {
    icon: ChefHat,
    title: "Recipe ideas & suggestions",
    description: "Discover recipes that fit your diet. Swap ingredients, adjust portions, and stay on plan.",
    color: "from-orange-500/20 to-amber-500/20",
    iconColor: "text-orange-500",
  },
  {
    icon: BarChart3,
    title: "Progress tracking",
    description: "Log meals, track adherence, and see how your nutrition aligns with your health goals over time.",
    color: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  {
    icon: Bell,
    title: "Meal reminders",
    description: "Never miss a meal. Set reminders that fit your schedule and stay consistent.",
    color: "from-red-500/20 to-rose-500/20",
    iconColor: "text-red-500",
  },
  {
    icon: Target,
    title: "Goals & accountability",
    description: "Set weight, energy, and wellness goals. Our AI helps you stay accountable with data-driven insights.",
    color: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-500",
  },
];

const WhatWeDoSection = () => {
  return (
    <section id="what-we-do" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-3xl mb-20">
          <h2 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
              What we do
            </span>
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
            From personalized plans to tracking and reminders—everything you need to manage your condition with food.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 perspective-[2000px]">
          {CAPABILITIES.map((item, idx) => (
            <div
              key={idx}
              className="group relative h-full"
            >
              <div className={cn(
                "relative h-full p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm",
                "transition-all duration-500 ease-out",
                "hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:bg-card",
                "overflow-hidden"
              )}>
                {/* Hover Gradient Blob */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                  "bg-gradient-to-br",
                  item.color
                )} />

                <div className="relative z-10 flex flex-col h-full">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                    "bg-background shadow-sm border border-border/50",
                    "group-hover:scale-110 transition-transform duration-500",
                    item.iconColor
                  )}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:translate-x-1 transition-transform duration-300">
                    {item.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed mb-6 flex-grow group-hover:text-foreground/80 transition-colors">
                    {item.description}
                  </p>

                  <div className="flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    Learn more <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatWeDoSection;
