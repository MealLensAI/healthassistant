const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl lg:text-5xl font-normal mb-6">
            Using food to maintain,treat
            <br />
            <span className="text-muted-foreground font-normal">and restore or improve patient health</span>
          </h2>
        </div>

        {/* Main Feature - Health Focused */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-24">
          <div className="lg:order-2">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
              How It Works
            </span>
            <h3 className="text-2xl lg:text-3xl font-normal mb-6">
              Tell our AI your sickness, get food recommendations
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              If you have a chronic disease, you just tell our AI your sickness, and it recommends food that you can eat that will maintain your health and give you better health. At the same time, it can also restore or improve your health based on your health condition.
            </p>
            
            <div className="mb-8">
              <h4 className="font-medium mb-4 text-primary">How this happens</h4>
              <p className="text-muted-foreground mb-4">You provide our AI with your health data:</p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Provide your health data</p>
                    <p className="text-muted-foreground text-sm">Give our AI data about you: weight, age, gender, and your health condition.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">AI generates personalized food recommendations</p>
                    <p className="text-muted-foreground text-sm">Our AI automatically generates food that you can eat that will maintain your health, and at some point gradually recover, restore, or improve your health based on the kind of chronic disease that you have.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-accent rounded-lg aspect-[4/3] flex items-center justify-center border border-border overflow-hidden lg:order-1">
            <img 
              src="/assets/Screenshot_2025-12-14_at_11.07.29-3201fdec-52ea-4b1a-a161-7dc41f538dd3.png" 
              alt="Diet Planner - Personalized meal plans"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = '<p class="text-muted-foreground text-sm text-center py-8">Health dashboard preview</p>';
                }
              }}
            />
          </div>
        </div>

        {/* Problem 3 - Nutritionists & Dietitians */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-24">
          <div>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
              For Nutritionists & Dietitians
            </span>
            <h3 className="text-2xl lg:text-3xl font-normal mb-6">
              Automate manual processes
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Nutritionists and dietitians currently do all these things manually. With our product, they won't need to do everything manually. They will just use MealLensAI and it will automatically do everything for them, saving time and making them manage more users at once and focus on other things.
            </p>
            
            <div>
              <h4 className="font-medium mb-4 text-primary">Benefits</h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Automated calculations</p>
                    <p className="text-muted-foreground text-sm">No more manual BMI/BMR calculations for each patient.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Monitor and track patient data and progress</p>
                    <p className="text-muted-foreground text-sm">Monitor and track patient data and progress over time, saving them time.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Manage more users at once</p>
                    <p className="text-muted-foreground text-sm">Handle more patients in less time with automated processes.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Focus on other important tasks</p>
                    <p className="text-muted-foreground text-sm">AI-powered food recommendations free up time to focus on other things.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-accent rounded-lg aspect-[4/3] flex items-center justify-center border border-border overflow-hidden">
            <img 
              src="/assets/nutritionist-dashboard.png" 
              alt="Nutritionist dashboard - User management and patient tracking"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = '<p class="text-muted-foreground text-sm text-center py-8">Nutritionist dashboard preview</p>';
                }
              }}
            />
          </div>
        </div>

        {/* Problem 4 - Insurance Companies */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="lg:order-2">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
              For Insurance Companies
            </span>
            <h3 className="text-2xl lg:text-3xl font-normal mb-6">
              Reduce healthcare costs
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Insurance companies need to save money. People with health insurance can use our product, and it will automatically reduce the amount of money they spend on treating people with sickness, getting them better health, and reducing the amount of costs the company spends.
            </p>
            
            <div>
              <h4 className="font-medium mb-4 text-primary">Benefits</h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Lower healthcare costs</p>
                    <p className="text-muted-foreground text-sm">Reduce the amount of money spent on treating people with sickness.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Better health outcomes</p>
                    <p className="text-muted-foreground text-sm">Help insured clients get better health through personalized nutrition.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Reduced company costs</p>
                    <p className="text-muted-foreground text-sm">Automatically reduce the amount of costs the company spends on healthcare claims.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-accent rounded-lg aspect-[4/3] flex items-center justify-center border border-border overflow-hidden lg:order-1">
            <img 
              src="/assets/health-insurance.png" 
              alt="Health Insurance - Cost reduction and better outcomes"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.innerHTML = '<p class="text-muted-foreground text-sm text-center py-8">Insurance dashboard preview</p>';
                }
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
