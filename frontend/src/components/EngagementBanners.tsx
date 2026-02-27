import { MessageCircle, Sparkles } from "lucide-react";
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
    "Hello Daniel, I am reaching out from MealLensAI for consultation, doctor follow-up, or feedback."
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="mx-4 sm:mx-6 md:mx-8 mt-4 space-y-3">
      {showMotivation && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3B6FD4] via-[#4B7FE2] to-[#5E93ED] px-6 sm:px-8 py-5 sm:py-7 text-white shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs sm:text-sm font-bold tracking-[0.15em] uppercase opacity-90 mb-1">
                Daily Motivation
              </p>
              <p className="text-[15px] sm:text-[18px] font-medium leading-snug italic opacity-95">
                &ldquo;{dailyQuote}&rdquo;
              </p>
            </div>
            <button
              onClick={() => setShowMotivation(false)}
              className="flex-shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors"
              aria-label="Dismiss motivation"
            >
              <span className="text-lg leading-none opacity-70 hover:opacity-100">×</span>
            </button>
          </div>
        </div>
      )}

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-lg border border-green-200 bg-gradient-to-r from-green-50 via-white to-green-50 p-3 sm:p-4 shadow-sm hover:shadow-md animate-notice-zoom"
        aria-label="Reach out on WhatsApp"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-sm">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5 rounded-full bg-green-500 animate-ping" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.1em] uppercase text-green-700">
              WhatsApp Support
            </p>
            <p className="text-xs sm:text-sm font-semibold text-gray-900">
              Need consultation, personal follow-up, or feedback?
            </p>
            <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
              Message us on WhatsApp: +254 748 703 778
            </p>
          </div>
        </div>
      </a>
    </div>
  );
}
