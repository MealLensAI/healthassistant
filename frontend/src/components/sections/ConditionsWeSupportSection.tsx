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
        {/* Curved Carousel Effect for the three conditions */}
        <div className="flex gap-4 sm:gap-5 md:gap-6 max-w-[1000px] lg:max-w-[1100px] mx-auto overflow-x-auto snap-x snap-mandatory pb-10 md:pb-16 md:flex-row md:justify-center md:items-stretch md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:[perspective:1000px] md:[transform-style:preserve-3d] -mt-8 md:-mt-16">
          {CONDITIONS.map((item, index) => (
            <article
              key={item.name}
              className={cn(
                "group flex flex-col snap-center shrink-0 w-[75vw] sm:w-[260px] md:w-[300px] lg:w-[320px] transition-transform duration-700 ease-out relative",
                // Concave 3D Carousel effect for desktop (inside of cylinder)
                index === 0 && "md:origin-right md:[transform:rotateY(22deg)]",
                index === 1 && "md:z-10",
                index === 2 && "md:origin-left md:[transform:rotateY(-22deg)]",
                // Mobile fallback
                "max-md:[transform:none]"
              )}
            >
              <div
                className="relative w-full aspect-[4/5] overflow-hidden rounded-md bg-muted shadow-lg transition-shadow duration-700 ease-out group-hover:shadow-xl"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              <div className="mt-6 text-center px-2">
                <h3 className="font-bold text-lg sm:text-xl text-foreground tracking-tight transition-colors group-hover:text-primary">
                  {item.name}
                </h3>
                {(item as any).shortDesc && (
                  <p className="mt-2 text-sm text-muted-foreground leading-snug max-w-[200px] mx-auto">
                    {(item as any).shortDesc}
                  </p>
                )}
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
