const OrganizationsSection = () => {

  return (
    <section id="organizations" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
            For Organizations
          </span>
          <h2 className="text-3xl lg:text-4xl font-normal mb-6">
            Automate processes and reduce costs
          </h2>
          <p className="text-lg text-muted-foreground">
            Nutritionists, dietitians, and insurance companies use MealLensAI to automate manual processes and reduce healthcare costs.
          </p>
        </div>

        {/* Organization types */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Nutritionists & Dietitians */}
          <div className="border border-border rounded-lg p-8 bg-card">
            <h3 className="text-xl font-normal mb-4">Nutritionists & Dietitians</h3>
            <p className="text-muted-foreground mb-6">
              Nutritionists and dietitians currently do all these things manually. With our product, they won't need to do everything manually. They will just use MealLensAI and it will automatically do everything for them, saving time and making them manage more users at once and focus on other things.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Automated BMI/BMR calculations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                AI-powered food recommendations
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Monitor and track patient data and progress over time, saving them time
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Manage more users at once
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Focus on other important tasks
              </li>
            </ul>
          </div>

          {/* Insurance Companies */}
          <div className="border border-border rounded-lg p-8 bg-card">
            <h3 className="text-xl font-normal mb-4">Insurance Companies</h3>
            <p className="text-muted-foreground mb-6">
              Insurance companies need to save money. People with health insurance can use our product, and it will automatically reduce the amount of money they spend on treating people with sickness, getting them better health, and reducing the amount of costs the company spends.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Lower healthcare costs
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Better health outcomes for clients
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Reduced company spending
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Automated cost reduction
              </li>
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
};

export default OrganizationsSection;
