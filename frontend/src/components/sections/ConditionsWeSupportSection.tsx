import { useCallback, useEffect, useState, useRef } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const CONDITIONS = [
  {
    name: "Obesity & Weight Loss",
    shortDesc: "Calorie-conscious, balanced plans",
    image: "/assets/condition-obesity.png",
  },
  {
    name: "Diabetes",
    shortDesc: "Blood sugar–friendly meal plans",
    image: "/assets/condition-diabetes.png",
  },
  {
    name: "High Blood Pressure",
    shortDesc: "Heart-healthy, low-sodium options",
    image: "/assets/condition-hypertension.png",
  },
  {
    name: "High Cholesterol",
    shortDesc: "Low-saturated-fat, fiber-rich meals",
    image: "https://images.unsplash.com/photo-1547592180-85f173990664?w=400&h=600&fit=crop",
  },
  {
    name: "Heart Disease",
    shortDesc: "Cardioprotective nutrition",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop",
  },
  {
    name: "Kidney & Renal Care",
    shortDesc: "Kidney-friendly, controlled phosphorus",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop",
  },
  {
    name: "PCOS",
    shortDesc: "Hormone-supportive, low-GI diets",
    image: "https://images.unsplash.com/photo-1604329760661-e71dc83f2b26?w=400&h=600&fit=crop",
  },
  {
    name: "Cancer Support",
    shortDesc: "Nutrient-dense, immune-supportive food",
    image: "https://images.unsplash.com/photo-1579684947550-22e945225d9a?w=400&h=600&fit=crop",
  },
  {
    name: "Thyroid",
    shortDesc: "Iodine-aware, balanced nutrition",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=600&fit=crop",
  },
  {
    name: "Celiac & Gluten-Free",
    shortDesc: "Safe, gluten-free meal plans",
    image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=600&fit=crop",
  },
  {
    name: "IBS & Gut Health",
    shortDesc: "Low-FODMAP, gut-friendly options",
    image: "/assets/condition-ibs.png",
  },
];

const ConditionsWeSupportSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // 3D Scroll Effect Logic
  const onScroll = useCallback((api: CarouselApi) => {
    if (!api) return;

    const scrollProgress = api.scrollProgress();
    const slides = api.slideNodes();
    const snapList = api.scrollSnapList();
    
    slides.forEach((slide, index) => {
      const target = snapList[index];
      // Calculate distance from the current scroll position
      // We handle the loop wrapping logic approximately here for visual effect
      let distance = (scrollProgress - target);
      
      // Adjust for loop wrapping if needed (simplified for this visual effect)
      if (distance < -0.5) distance += 1;
      if (distance > 0.5) distance -= 1;

      // Calculate rotation and translation based on distance from center
      // Distance is roughly -0.5 to 0.5 where 0 is center
      
      // "Eye glass" / Cylinder effect:
      // Rotate Y based on distance
      const rotateY = distance * 100; // Adjust multiplier for curvature
      const translateZ = Math.abs(distance) * -300; // Push back sides
      const scale = 1 - Math.abs(distance) * 0.2; // Scale down sides slightly

      // Apply transform to the inner container of the slide
      const inner = slide.querySelector('.slide-inner') as HTMLElement;
      if (inner) {
        inner.style.transform = `perspective(1000px) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
      }
    });
  }, []);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });

    api.on("scroll", () => onScroll(api));
    api.on("reInit", () => onScroll(api));
    
    // Initial call
    onScroll(api);

  }, [api, onScroll]);

  return (
    <section id="conditions" className="py-4 bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="relative">
          {/* 
            The perspective container is crucial for the 3D effect.
            We use a mask to fade out the edges, enhancing the "cylinder" look.
          */}
          <div className="relative w-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
                containScroll: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4 md:-ml-8 py-10">
                {CONDITIONS.map((item, idx) => (
                  <CarouselItem 
                    key={idx} 
                    className="pl-4 md:pl-8 basis-[60%] md:basis-[40%] lg:basis-[22%] transition-all duration-500 ease-out"
                    style={{ perspective: '1000px' }} // Ensure perspective is available for the 3D transform
                  >
                    <div className="slide-inner group relative flex flex-col items-center cursor-pointer transition-transform duration-100 ease-linear will-change-transform">
                      <div className={cn(
                        "relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden mb-6 shadow-lg",
                        "transition-all duration-500 ease-out",
                        "group-hover:shadow-2xl group-hover:-translate-y-2",
                        "ring-1 ring-border/50 bg-background"
                      )}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=600&fit=crop";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
                      </div>
                      
                      <div className="text-center px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <h3 className="font-bold text-lg text-foreground mb-1">
                          {item.name}
                        </h3>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              {/* Navigation Buttons */}
              <div className="hidden md:flex justify-center gap-4 mt-8">
                 <CarouselPrevious className="static translate-y-0 h-12 w-12 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all" />
                 <CarouselNext className="static translate-y-0 h-12 w-12 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all" />
              </div>
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConditionsWeSupportSection;
