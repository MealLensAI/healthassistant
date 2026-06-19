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
        My blood sugar was at 9.8, and I honestly felt stuck.
        Just one week after using MealLensAI, it dropped to 6.5!
        <br />
        <br />
        I didn&apos;t overhaul my whole life, I simply followed the meal guidance, and the results spoke for themselves.
        <br />
        <br />
        I&apos;m amazed at how fast it worked.
      </>
    ),
  },
  {
    name: "Chinyere",
    condition: "High Blood Pressure",
    image: "/assets/chinyere.png",
    quote: (
      <>
        As a high blood pressure patient, I started using MealLensAI in December 2025 and followed the meal plan it generated.
        <br />
        <br />
        Since then, I haven&apos;t had to take my blood pressure medication again. The change has been incredible, and I feel so much better day to day.
        <br />
        <br />
        I&apos;m truly grateful I found MealLensAI it has helped me more than I expected.
      </>
    ),
  },
];

const ConditionsWeSupportSection = () => {
  return (
    <section id="conditions" className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* All three visible at once — no carousel needed for a fixed set of three */}
        <div className="flex gap-5 sm:gap-8 md:gap-10 max-w-4xl mx-auto overflow-x-auto snap-x snap-mandatory pb-2 md:pb-0 md:grid md:grid-cols-3 md:overflow-visible items-end justify-items-center [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CONDITIONS.map((item, index) => (
            <article
              key={item.name}
              className={cn(
                "group flex flex-col items-center snap-center shrink-0 w-[72vw] sm:w-[240px] md:w-full",
                index === 1 && "md:-translate-y-4"
              )}
            >
              <div
                className={cn(
                  "relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden",
                  "bg-muted shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]",
                  "ring-1 ring-border/60",
                  "transition-all duration-500 ease-out",
                  "group-hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.22)] group-hover:-translate-y-1.5",
                  index === 1 && "md:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)]"
                )}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>

              <div className="mt-5 text-center px-1">
                <h3 className="font-semibold text-base sm:text-lg text-foreground tracking-tight">
                  {item.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground leading-snug max-w-[200px] mx-auto">
                  {item.shortDesc}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-16 md:mt-20 grid md:grid-cols-2 gap-8 lg:gap-12">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.name}
              className="flex flex-col items-center text-center"
            >
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-border/50 shadow-lg mb-6">
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

              <footer>
                <p className="font-semibold text-foreground">
                  — {testimonial.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {testimonial.condition}
                </p>
              </footer>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ConditionsWeSupportSection;
