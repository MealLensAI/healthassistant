import { cn } from "@/lib/utils";

const CONDITIONS = [
  {
    name: "Diabetes",
    image: "/assets/condition-diabetes.png",
  },
  {
    name: "High Blood Pressure",
    image: "/assets/condition-hypertension.png",
  },
  {
    name: "Ulcers",
    image: "/assets/condition-ulcers.png",
  },
];

const TESTIMONIALS = [
  {
    name: "Standly",
    condition: "Diabetes",
    image: "/assets/standly.png",
    quote: (
      <>
        My blood sugar was at 9.8, and I honestly felt stuck. Just one week
        after using MealLensAI, it dropped to 6.5!
        <br />
        <br />
        I didn&apos;t overhaul my whole life. I simply followed the meal
        guidance, and the results spoke for themselves.
      </>
    ),
  },
  {
    name: "Chinyere",
    condition: "High Blood Pressure",
    image: "/assets/chinyere.png",
    quote: (
      <>
        As a high blood pressure patient, I started using MealLensAI and
        followed the meal plan it generated.
        <br />
        <br />
        The change has been incredible. I feel so much better day to day,
        and I&apos;m grateful I found a way to eat right that I could actually
        stick with.
      </>
    ),
  },
];

const ConditionsWeSupportSection = () => {
  return (
    <section id="conditions" className="py-24 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf mb-4">
            Conditions we support
          </p>
          <h2 className="font-display text-3xl lg:text-5xl tracking-tight mb-5">
            Built for chronic conditions, starting with the ones that matter most
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Diabetes, high blood pressure, ulcers, and more. Food that works
            with your body, not against it.
          </p>
        </div>

        <div className="flex gap-4 sm:gap-5 md:gap-6 max-w-[1000px] lg:max-w-[1100px] mx-auto overflow-x-auto snap-x snap-mandatory pb-8 md:pb-12 md:flex-row md:justify-center md:items-stretch md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:[perspective:1000px] md:[transform-style:preserve-3d]">
          {CONDITIONS.map((item, index) => (
            <article
              key={item.name}
              className={cn(
                "group flex flex-col snap-center shrink-0 w-[75vw] sm:w-[260px] md:w-[300px] lg:w-[320px] transition-transform duration-700 ease-out relative",
                index === 0 && "md:origin-right md:[transform:rotateY(22deg)]",
                index === 1 && "md:z-10",
                index === 2 && "md:origin-left md:[transform:rotateY(-22deg)]",
                "max-md:[transform:none]"
              )}
            >
              <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-muted shadow-card transition-shadow duration-700 ease-out group-hover:shadow-elevated">
                <img
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              <div className="mt-5 text-center px-2">
                <h3 className="font-display text-lg sm:text-xl text-foreground tracking-tight transition-colors group-hover:text-primary">
                  {item.name}
                </h3>
              </div>
            </article>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-16 md:mt-20 grid md:grid-cols-2 gap-10 lg:gap-14">
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="flex flex-col items-center text-center"
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-2 ring-border mb-6">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <blockquote className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              <figcaption>
                <p className="font-semibold text-foreground">
                  {testimonial.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {testimonial.condition}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ConditionsWeSupportSection;
