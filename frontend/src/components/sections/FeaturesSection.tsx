const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl lg:text-5xl font-normal mb-6">
            We solve two problems
            <br />
            <span className="text-muted-foreground font-normal">that nobody talks about.</span>
          </h2>
        </div>

        {/* Problem 1 */}
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-24">
          <div>
            <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
              Problem One
            </span>
            <h3 className="text-2xl lg:text-3xl font-normal mb-6">
              Cooking burnout is real.
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              You buy ingredients, but end up cooking the same 2 meals over and over.
              The food gets boring. Decision fatigue kicks in. You feel like you have
              "nothing to eat" — even when your kitchen is full.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Snap your ingredients</p>
                  <p className="text-muted-foreground text-sm">Take a photo or type what you have. Get 10+ recipe ideas with steps.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Weekly meal plans</p>
                  <p className="text-muted-foreground text-sm">Based on your ingredients, budget, and location.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">See a dish, learn to cook it</p>
                  <p className="text-muted-foreground text-sm">Snap any food and our AI will teach you how to make it.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-accent rounded-lg aspect-[4/3] flex items-center justify-center border border-border">
            <p className="text-muted-foreground text-sm">App preview</p>
          </div>
        </div>

        {/* Problem 2 - Blue for Health */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="lg:order-2">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-4 block">
              Problem Two
            </span>
            <h3 className="text-2xl lg:text-3xl font-normal mb-6">
              Better Health Through Food for Health Conditions
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Most people with chronic conditions do not even know that they can just get a better health by using food. Or most people with medical conditions don't know <em>what food is safe</em>, <em>what food helps</em>, or <em>how to cook within restrictions</em>.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Condition-based recommendations</p>
                  <p className="text-muted-foreground text-sm">Enter your health conditions. Get foods that actually help.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Turn restrictions into variety</p>
                  <p className="text-muted-foreground text-sm">If you are a patient who is being told you can only eat yam and beans alone for your entire life, you give our AI that food ingredient and we can generate like 10+ food you can make with those that are tailored to your sickness.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 bg-primary rounded-full flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">AI Nutritionist & Progress Tracking</p>
                  <p className="text-muted-foreground text-sm">Also saves as an AI nutritionist. Track progress over time.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-accent rounded-lg aspect-[4/3] flex items-center justify-center border border-border lg:order-1">
            <p className="text-muted-foreground text-sm">Health dashboard preview</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
