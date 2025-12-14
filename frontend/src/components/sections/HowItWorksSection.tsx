const steps = [
  {
    number: "1",
    title: "Tell us your sickness",
    description: "Tell us your sickness and provide your health data (weight, age, gender, health condition).",
    image: "/assets/Screenshot_2025-12-14_at_11.06.14-2d5c32a1-d246-4ecd-9f87-9dcd37c25e39.png",
  },
  {
    number: "2",
    title: "Get personalized food recommendations",
    description: "We automatically generate food that you can eat that will maintain your health, and at some point gradually recover or reverse your sickness based on the kind of chronic disease that you have.",
    image: "/assets/Screenshot_2025-12-14_at_11.07.29-3201fdec-52ea-4b1a-a161-7dc41f538dd3.png",
  },
  {
    number: "3",
    title: "Track your progress",
    description: "Monitor your health improvements over time with detailed progress tracking and health data.",
    image: "/assets/Screenshot_2025-12-14_at_11.08.28-2519680c-28ad-4b35-8caa-4fc0a4317ab5.png",
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
            Get personalized food recommendations in 3 simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <span className="text-5xl font-bold text-primary/20">
                    {step.number}
                  </span>
                  <div className="pt-2 flex-1">
                    <h3 className="font-medium mb-2 text-lg">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
                {/* Image */}
                <div className="w-full aspect-video bg-accent rounded-lg border border-border overflow-hidden shadow-sm">
                  <img 
                    src={step.image} 
                    alt={step.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image doesn't load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerHTML = '<p class="text-muted-foreground text-sm text-center py-8">App preview</p>';
                      }
                    }}
                  />
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
