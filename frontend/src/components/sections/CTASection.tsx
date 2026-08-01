import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-atmosphere pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl lg:text-5xl tracking-tight mb-5">
            Make eating right the easy part
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Start with one free 7-day meal plan. Cook and plan meals that fit
            your health, your budget, and your real life.
          </p>

          <Button
            variant="hero"
            size="lg"
            className="bg-primary hover:bg-blue-deep text-white rounded-full"
            onClick={() => navigate("/signup")}
          >
            Start free
          </Button>

          <p className="text-sm text-muted-foreground mt-6">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
