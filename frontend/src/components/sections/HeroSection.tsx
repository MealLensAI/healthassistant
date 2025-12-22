import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 pt-32 pb-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center min-h-[calc(100vh-200px)] flex flex-col justify-center">
          
          {/* Main Headline - Simple, clean */}
          <h1 className="text-3xl sm:text-6xl lg:text-6xl font-normal leading-[1.1] mb-8 text-foreground tracking-tight">
            {/* Using food to maintain
            <br /> */}
            <span className="text-primary">Using AI to turn everyday food into care for chronic conditoins.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12 font-normal">
            An AI solution for people with chronic condition. Tell our AI your sickness, and it recommends food that maintains your health and can restore or improve your condition based on your health data.
          </p>

          {/* CTA Buttons - Simple Google-style */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              variant="hero" 
              size="lg" 
              className="group bg-primary hover:bg-blue-deep text-white"
              onClick={() => navigate('/signup')}
            >
              Get Started
            </Button>
            <Button 
              variant="heroOutline" 
              size="lg" 
              className="group border border-border text-foreground hover:bg-accent"
              onClick={() => {
                const featuresSection = document.getElementById('features');
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Learn More
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Trusted by people with chronic condition, nutritionists, dietitians, and insurance companies.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
