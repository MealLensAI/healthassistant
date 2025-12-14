import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OrganizationsSection = () => {
  const navigate = useNavigate();

  return (
    <section id="organizations" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
            For Organizations
          </span>
          <h2 className="text-3xl lg:text-4xl font-normal mb-6">
            Help more patients, reduce costs.
          </h2>
          <p className="text-lg text-muted-foreground">
            Hospitals, pharmacies, nutritionists, and insurance companies use MealLensAI
            to scale their nutrition guidance without scaling their staff.
          </p>
        </div>

        {/* Organization types */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Hospitals, Pharmacies, Clinics, Nutritionists */}
          <div className="border border-border rounded-lg p-8 bg-card">
            <h3 className="text-xl font-normal mb-4">Hospitals, Pharmacies, Clinics, Nutritionists</h3>
            <p className="text-muted-foreground mb-6">
              Provide patients with diet guidance through a controlled subscription.
              Organizations can update user data and view progress <strong>without seeing the user's daily activity</strong>.
              Organizations manage subscription duration; users contacting them when time expires.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                10x faster diet planning
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Automated meal recommendations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Patient progress tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Speed to handle lot of patients at once
              </li>
            </ul>
          </div>

          {/* Insurance/HMOs */}
          <div className="border border-border rounded-lg p-8 bg-card">
            <h3 className="text-xl font-normal mb-4">Insurance & HMOs Companies</h3>
            <p className="text-muted-foreground mb-6">
              Provide their clients who are on health insurance have chronic sickness MealLensAI which will give them better health and at same time reduce cost for the insurance companies.
              Organizations can update user data and view progress <strong>without seeing the user's daily activity</strong>.
              Organizations manage subscription duration; users contacting them when time expires.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Lower healthcare claims
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Healthier client base
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Reduced costs for insurance companies
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Competitive advantage
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Button 
            variant="hero" 
            size="lg" 
            className="group"
            onClick={() => navigate('/signup')}
          >
            Partner With Us
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="heroOutline" size="lg">
            Schedule a Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default OrganizationsSection;
