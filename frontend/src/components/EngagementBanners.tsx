import { useMemo, useState } from "react";

const QUOTES = [
  "Every meal you complete is a win for your health.",
  "Small food choices today create better health tomorrow.",
  "Consistency beats perfection in nutrition.",
  "Your meal plan works best when you trust the process.",
  "Healthy routines are built one cooked meal at a time.",
];

export default function EngagementBanners() {
  const [showMotivation, setShowMotivation] = useState(true);

  const dailyQuote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

  const whatsappNumber = "254748703778";
  const whatsappMessage = encodeURIComponent(
    "Hello, I am reaching out from MealLensAI for consultation or feedback."
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="mx-4 sm:mx-6 md:mx-8 mt-4 space-y-3">
      {showMotivation && (
        <div className="relative rounded-2xl bg-leaf-soft border border-leaf/15 px-5 sm:px-7 py-5 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-leaf mb-2">
                A thought for today
              </p>
              <p className="text-[15px] sm:text-lg font-medium leading-snug text-foreground">
                &ldquo;{dailyQuote}&rdquo;
              </p>
            </div>
            <button
              onClick={() => setShowMotivation(false)}
              className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl border border-border bg-card px-5 sm:px-6 py-4 hover:border-primary/30 transition-colors"
        aria-label="Reach out on WhatsApp"
      >
        <div className="text-left">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase text-primary mb-1">
            Need a hand?
          </p>
          <p className="text-sm sm:text-[15px] font-semibold text-foreground">
            Message us on WhatsApp for consultation or feedback
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            +254 748 703 778
          </p>
        </div>
      </a>
    </div>
  );
}
