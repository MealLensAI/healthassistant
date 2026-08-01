const ProblemSection = () => {
  return (
    <section id="why" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-atmosphere pointer-events-none" />
      <div className="container mx-auto px-4 lg:px-8 relative">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf mb-6">
            The real problem
          </p>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-8">
            Doctors tell you to eat healthy and cut sugar.{" "}
            <span className="text-muted-foreground">
              You already know what to eat.
            </span>
          </h2>

          <div className="space-y-5 text-lg text-muted-foreground leading-relaxed">
            <p>
              You just can&apos;t do it consistently. Not because you
              don&apos;t care, but because changing habits is hard. Meal plans
              feel like chores when cooking takes time and energy you
              don&apos;t have, and every day still starts with the same
              question: what should I eat for my condition?
            </p>
            <p className="text-foreground font-medium">
              The issue isn&apos;t discipline. It&apos;s that nothing made
              knowing what to eat, and actually doing it, easy.
            </p>
          </div>

          <div className="mt-12 pt-10 border-t border-border">
            <p className="font-display text-2xl sm:text-3xl tracking-tight text-foreground">
              Hospitals don&apos;t solve adherence.{" "}
              <span className="text-primary">MealLensAI does.</span>
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Food for you turns “what should I eat?” into meals that fit your
              health, wherever you live.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
