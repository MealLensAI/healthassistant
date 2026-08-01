import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { imageCache } from '@/lib/imageCache';

const MAX_IMAGE_RETRIES = 3;
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';

interface RecipeCardProps {
  title: string;
  time: string;
  rating: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onClick?: () => void;
  originalTitle?: string;
  mealPlanId?: string | null;
  day?: string;
  isCooked?: boolean;
  onMarkCooked?: () => Promise<void>;
  onUnmarkCooked?: () => Promise<void>;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  title,
  mealType,
  onClick,
  originalTitle,
  mealPlanId,
  day,
  isCooked = false,
  onMarkCooked,
  onUnmarkCooked,
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [cookingLoading, setCookingLoading] = useState(false);
  const retryCountRef = useRef(0);

  // Always look the image up via the trusted upstream image API
  // (configured via VITE_IMAGES_API_URL in .env, proxied at
  // /image-api/image to avoid CORS). There is no DB-stored URL fallback
  // and no Unsplash fallback — if the API doesn't return a usable
  // image, we render a styled placeholder div instead.
  const fetchFoodImage = async (foodName: string, forceRefresh = false) => {
    setImageLoading(true);
    try {
      const url = forceRefresh
        ? await imageCache.refreshImage(foodName)
        : await imageCache.getImage(foodName);
      setFoodImage(url);
    } catch (error) {
      console.error('[RecipeCard] Image fetch failed:', error);
      setFoodImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  useEffect(() => {
    retryCountRef.current = 0;
    // Prefer the AI's clean food name (originalTitle) when available; the
    // shortened `title` is what's shown to the user and may have been
    // truncated.
    const query = (originalTitle && originalTitle.trim()) || title;
    fetchFoodImage(query);
  }, [title, originalTitle]);

  // Retry-with-backoff on <img> onError. We invalidate the cached (broken)
  // URL so the refresh actually hits the image API again, and try a few
  // query variations before giving up entirely.
  const handleImageError = () => {
    const attempt = retryCountRef.current;
    if (attempt >= MAX_IMAGE_RETRIES) {
      setFoodImage(null);
      setImageLoading(false);
      return;
    }

    retryCountRef.current = attempt + 1;

    const baseName = (originalTitle && originalTitle.trim()) || title;
    const variants = [
      baseName,
      `${baseName} dish`,
      `${baseName} meal`,
      `${mealType} ${baseName.split(' ').slice(0, 2).join(' ')}`,
    ];
    const nextQuery = variants[attempt] || baseName;

    imageCache.invalidate(nextQuery);
    const delay = attempt === 0 ? 0 : 400 * Math.pow(2, attempt - 1);
    setTimeout(() => {
      fetchFoodImage(nextQuery, true);
    }, delay);
  };

  const getMealTypeBadge = () => {
    const badges: Record<string, { bg: string; text: string }> = {
      breakfast: { bg: 'bg-amber-600/90', text: 'Breakfast' },
      lunch: { bg: 'bg-leaf', text: 'Lunch' },
      dinner: { bg: 'bg-primary', text: 'Dinner' },
      snack: { bg: 'bg-foreground/70', text: 'Snack' },
    };
    return badges[mealType] || badges.dinner;
  };

  const getPlaceholderStyle = () => {
    const styles: Record<string, string> = {
      breakfast: 'from-amber-50 to-amber-100 text-amber-600',
      lunch: 'from-[hsl(152_30%_94%)] to-[hsl(152_25%_88%)] text-leaf',
      dinner: 'from-[hsl(213_55%_94%)] to-[hsl(213_45%_88%)] text-primary',
      snack: 'from-secondary to-muted text-muted-foreground',
    };
    return styles[mealType] || styles.dinner;
  };

  const badge = getMealTypeBadge();
  const showTrackingButton = mealPlanId && day && (onMarkCooked || onUnmarkCooked);

  const [triggerPop, setTriggerPop] = useState(false);

  useEffect(() => {
    if (isCooked) {
      setTriggerPop(true);
      const timer = setTimeout(() => setTriggerPop(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isCooked]);

  const handleCookToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cookingLoading || isCooked) return;

    setCookingLoading(true);
    try {
      if (onMarkCooked) {
        await onMarkCooked();

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        Swal.fire({
          title: 'Congratulations!',
          text: `You cooked ${originalTitle || title}!`,
          icon: 'success',
          confirmButtonText: 'Awesome!',
          confirmButtonColor: '#4CAF50',
          timer: 3000,
          timerProgressBar: true,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again in a moment.';
      console.error('[RecipeCard] mark cooked failed:', err);
      Swal.fire({
        title: "Couldn't save your progress",
        text: message,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#EF4444',
      });
    } finally {
      setCookingLoading(false);
    }
  };

  return (
    <div
      className={`bg-card rounded-2xl overflow-hidden cursor-pointer group border shadow-soft hover:shadow-card transition-all duration-300 ${
        isCooked ? 'border-leaf/40 ring-1 ring-leaf/20' : 'border-border'
      }`}
      onClick={onClick}
    >
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-heartbeat {
          animation: heartbeat 2s infinite ease-in-out;
        }
      `}</style>
      <div className="relative h-36 sm:h-40 md:h-44">
        {imageLoading ? (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
        ) : foodImage ? (
          <img
            src={foodImage}
            alt={title}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderStyle()} flex flex-col items-center justify-center`}>
            <span className="text-xs font-medium opacity-70">No image available</span>
          </div>
        )}
        {!imageLoading && (
          <>
            <div className={`absolute top-3 left-3 ${badge.bg} text-white text-xs font-semibold px-3 py-1.5 rounded-full`}>
              {badge.text}
            </div>

            {showTrackingButton && (
              <button
                onClick={handleCookToggle}
                disabled={cookingLoading || isCooked}
                className={`absolute bottom-3 right-3 shadow-card flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 z-10 ${
                  triggerPop
                    ? 'scale-110 bg-leaf text-white'
                    : isCooked
                      ? 'bg-leaf text-white cursor-default'
                      : 'bg-card text-foreground hover:text-leaf border border-border'
                } ${cookingLoading ? 'opacity-70 cursor-wait' : ''}`}
                title={isCooked ? 'You already cooked this meal!' : 'Mark cooked'}
              >
                {cookingLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCooked ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Cooked</span>
                  </>
                ) : (
                  <span>Mark cooked</span>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-sm sm:text-[15px] font-bold text-foreground mb-2 line-clamp-2 leading-snug">
          {originalTitle || title}
        </h3>

        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="text-xs font-medium text-primary hover:underline transition-colors"
        >
          View recipe details
        </button>
      </div>
    </div>
  );
};

export default RecipeCard;
