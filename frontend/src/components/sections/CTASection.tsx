import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-5xl font-normal mb-6">
            Ready to change how you eat?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands who've ended cooking burnout and improved their health
            through smarter eating.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              variant="hero" 
              size="lg" 
              className="group"
              onClick={() => navigate('/signup')}
            >
              Get Started
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required. Free plan available forever.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
