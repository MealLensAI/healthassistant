const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl lg:text-5xl font-normal mb-6">
            Better Health Through Food
            <br />
            <span className="text-muted-foreground font-normal">for Health Conditions</span>
          </h2>
        </div>

        {/* Problem 2 - Health Focused */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-24">
          <div className="lg:order-2">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
              Problem 2
            </span>
            <h3 className="text-2xl lg:text-3xl font-normal mb-6">
              Better Health Through Food for Health Conditions
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Most people with chronic conditions do not even know that they can just get a better health by using food. Or most people with medical conditions don't know <em>what food is safe</em>, <em>what food helps</em>, or <em>how to cook within restrictions</em>.
            </p>
            
            <div className="mb-8">
              <h4 className="font-medium mb-4 text-primary">Solution</h4>
              <p className="text-muted-foreground mb-4">MealLensAI becomes a food-based health coach:</p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Enter symptoms/conditions or snap ingredients</p>
                    <p className="text-muted-foreground text-sm">Users enter symptoms/conditions or snap their ingredients.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">AI generates health-safe meals</p>
                    <p className="text-muted-foreground text-sm">AI generates <strong>health-safe meals</strong> and variations.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Personalized nutrition</p>
                    <p className="text-muted-foreground text-sm">Personalized using: exercise level, height, weight, gender, waist, age, country, health condition, and health goals.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">BMI/BMR calculations</p>
                    <p className="text-muted-foreground text-sm">AI calculates BMI/BMR to refine nutrition. Shows past health data to track improvement.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-accent/50 border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A doctor and nutritionist use data such as height, weight, gender, and health conditions to calculate a patient's BMI and BMR. This information is used to determine the specific nutrients a patient needs to maintain or improve their health. The nutritionist currently performs these calculations manually for each patient, but MealLensAI automates this process, saving time and potentially replacing the need for frequent nutritionist visits.
              </p>
            </div>
          </div>
          <div className="bg-accent rounded-lg aspect-[4/3] flex items-center justify-center border border-border lg:order-1">
            <p className="text-muted-foreground text-sm">Health dashboard preview</p>
          </div>
        </div>

        {/* Problem 3 - Organizations */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
              Problem 3
            </span>
            <h3 className="text-2xl lg:text-3xl font-normal mb-6">
              Organizations Can't Monitor Patient Diet
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Hospitals and pharmacies want to help patients through food, but they lack a simple system. Or nutritionists/hospitals want to help as many patients at once. (which cannot be done fast as they have a manual system currently)
            </p>
            
            <div>
              <h4 className="font-medium mb-4 text-primary">Solution</h4>
              <p className="text-muted-foreground mb-4">MealLensAI gives organizations:</p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Dashboard to update user health data</p>
                    <p className="text-muted-foreground text-sm">A dashboard to update user health data.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Speed and efficiency</p>
                    <p className="text-muted-foreground text-sm">Speed to handle many patients at once.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Privacy-focused progress tracking</p>
                    <p className="text-muted-foreground text-sm">A view of progress (not activity) for privacy.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Access control and alerts</p>
                    <p className="text-muted-foreground text-sm">Control over user access periods. Automatic alerts when a user's organization-set subscription ends.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-accent rounded-lg aspect-[4/3] flex items-center justify-center border border-border">
            <p className="text-muted-foreground text-sm">Organization dashboard preview</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
