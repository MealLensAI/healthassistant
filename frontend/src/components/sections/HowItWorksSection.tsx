const steps = [
  {
    number: "1",
    title: "Snap or type your ingredients",
    description: "Take a photo of what's in your fridge, or just type it out.",
  },
  {
    number: "2",
    title: "Tell us about you",
    description: "Health conditions, preferences, budget — so we can personalize.",
  },
  {
    number: "3",
    title: "Get recipes instantly",
    description: "10+ meal ideas with step-by-step instructions. Pick one and cook.",
  },
  {
    number: "4",
    title: "Track and improve",
    description: "Watch how your eating habits impact your health over time.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl lg:text-4xl font-normal mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground">
            From ingredients to plate in 4 simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-border -translate-x-4" />
              )}
              
              <div className="flex items-start gap-4">
                <span className="text-5xl font-bold text-primary/20">
                  {step.number}
                </span>
                <div className="pt-2">
                  <h3 className="font-medium mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
