import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 pt-32 pb-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center min-h-[calc(100vh-200px)] flex flex-col justify-center">

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.15] mb-6 text-foreground tracking-tight">
            Every Meal Can Either Help Your Condition or Hurt It.{" "}
            <span className="text-primary">Know the Difference Instantly.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8 font-normal">
            Transform everyday meals into a powerful tool for managing diabetes, hypertension, cancer, ulcers, and other health conditions with science-backed, personalized food recommendations.
          </p>

          {/* Secondary message */}
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3">
            Stop Guessing What to Eat. Start Eating for Better Health.
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            MealLensAI helps you identify what to eat, what to avoid, and how to build healthier eating habits based on your unique health profile.
          </p>

          {/* Broader conditions strip */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              "Diabetes",
              "Hypertension",
              "Cancer",
              "Ulcers",
              "& More",
            ].map((condition) => (
              <span
                key={condition}
                className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground border border-border"
              >
                {condition}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              variant="hero"
              size="lg"
              className="group bg-primary hover:bg-blue-deep text-white"
              onClick={() => navigate('/signup')}
            >
              Discover Foods That Work for You NOW!
            </Button>
            <Button
              variant="heroOutline"
              size="lg"
              className="group border border-border text-foreground hover:bg-accent"
              onClick={() => {
                const conditionsSection = document.getElementById('conditions');
                if (conditionsSection) {
                  conditionsSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Learn More
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Trusted by people managing health conditions, nutritionists, dietitians, and insurance companies.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
