const AUDIENCES = [
  {
    title: "People with chronic conditions",
    description:
      "Share your condition and health data. MealLensAI figures out what your body needs and recommends food you can cook yourself, so managing diabetes, ulcers, high blood pressure, and more becomes part of daily life, not another chore.",
    highlights: [
      "Personalized meal recommendations",
      "Recipes with clear cooking instructions",
      "Plans that fit your budget and location",
    ],
  },
  {
    title: "Nutritionists, dietitians & doctors",
    description:
      "Stop doing BMI, BMR, and meal planning by hand. Automate calculations, track patient progress, manage more people at once, and free your time for care that only you can give.",
    highlights: [
      "Automated BMI/BMR calculations",
      "Patient monitoring over time",
      "Scale your caseload without burnout",
    ],
  },
  {
    title: "Insurance companies",
    description:
      "Help insured members eat for better health outcomes. Better nutrition adherence means fewer complications, and lower claim costs over time.",
    highlights: [
      "Lower healthcare costs",
      "Better health outcomes",
      "Nutrition that supports recovery",
    ],
  },
  {
    title: "Wellness chefs",
    description:
      "Manage the people you cook for, get the meals their conditions need, and receive clear cooking instructions for every dish.",
    highlights: [
      "Condition-aware menus",
      "Cooking instructions included",
      "Serve clients with care and precision",
    ],
  },
];

const AudienceSection = () => {
  return (
    <section id="who" className="py-24 lg:py-28 bg-secondary/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf mb-4">
            Who it&apos;s for
          </p>
          <h2 className="font-display text-3xl lg:text-5xl tracking-tight mb-5">
            Built for everyone who makes food part of care
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            From people living with chronic conditions to the professionals
            who support them.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
          {AUDIENCES.map((audience) => (
            <div key={audience.title} className="py-2">
              <h3 className="font-display text-2xl tracking-tight mb-3 text-primary">
                {audience.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-5">
                {audience.description}
              </p>
              <ul className="space-y-2">
                {audience.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2.5 text-sm text-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-leaf flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AudienceSection;
