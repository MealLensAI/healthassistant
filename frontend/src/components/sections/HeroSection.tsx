import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 animate-reveal-scale">
        <img
          src="/assets/login-hero.png"
          alt="Preparing a fresh, condition-friendly meal"
          className="h-full w-full object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(213_55%_14%/0.78)] via-[hsl(152_30%_18%/0.55)] to-[hsl(40_30%_20%/0.25)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(213_40%_12%/0.5)] via-transparent to-[hsl(40_20%_20%/0.15)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-28 pb-16 min-h-[100svh] flex items-end lg:items-center">
        <div className="max-w-2xl text-white pb-8 lg:pb-0">
          <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold leading-snug tracking-tight mb-6 animate-fade-up">
            Super food platform for people with chronic conditions
          </p>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.2] font-bold tracking-tight mb-5 animate-fade-up-delay-1">
            Eating right for your condition shouldn&apos;t feel like a chore.
          </h1>

          <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-xl mb-8 animate-fade-up-delay-2">
            When you wonder what to eat for your condition — wherever you are —
            MealLensAI is the answer. Get Food for you, cook with clear
            instructions, and build weekly plans that fit your health, budget,
            and life.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 animate-fade-up-delay-3">
            <Button
              variant="hero"
              size="lg"
              className="bg-white text-primary hover:bg-white/90 shadow-elevated rounded-full"
              onClick={() => navigate("/signup")}
            >
              Start free
            </Button>
            <Button
              variant="heroOutline"
              size="lg"
              className="border-white/40 text-white hover:bg-white/10 hover:text-white rounded-full"
              onClick={() => scrollTo("how-it-works")}
            >
              See how it works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
