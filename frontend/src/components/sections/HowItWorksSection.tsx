const STEPS = [
  {
    number: "01",
    title: "Share your health profile",
    description:
      "Tell MealLensAI your condition and health data: weight, age, gender, activity level, height, and location.",
    image:
      "/assets/Screenshot_2025-12-14_at_11.06.14-2d5c32a1-d246-4ecd-9f87-9dcd37c25e39.png",
  },
  {
    number: "02",
    title: "Get food that fits your body",
    description:
      "We calculate BMI, BMR, obesity level, and the nutrients your body needs, then recommend meals that help you manage your health.",
    image:
      "/assets/Screenshot_2025-12-14_at_11.07.29-3201fdec-52ea-4b1a-a161-7dc41f538dd3.png",
  },
  {
    number: "03",
    title: "Cook with clear instructions",
    description:
      "Follow simple cooking steps for personalized recipes that fit your condition. Stay consistent without the friction.",
    image:
      "/assets/Screenshot_2025-12-14_at_11.08.28-2519680c-28ad-4b35-8caa-4fc0a4317ab5.png",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf mb-4">
            How it works
          </p>
          <h2 className="font-display text-3xl lg:text-5xl tracking-tight mb-5">
            From your health data to meals you can actually follow
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Personalized food recommendations in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 lg:gap-12">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col gap-5">
              <span className="font-display text-4xl text-primary/25 tracking-tight">
                {step.number}
              </span>
              <div>
                <h3 className="font-display text-xl tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
              <div className="mt-auto w-full aspect-[4/3] rounded-2xl overflow-hidden border border-border shadow-soft bg-muted">
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
