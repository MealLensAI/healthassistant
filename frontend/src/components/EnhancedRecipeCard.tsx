import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { imageCache } from '@/lib/imageCache';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';

const MAX_IMAGE_RETRIES = 3;

interface EnhancedRecipeCardProps {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    ingredients: string[];
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    benefit?: string;
    onClick: () => void;
    mealPlanId?: string | null;
    day?: string;
    isCooked?: boolean;
    onMarkCooked?: () => Promise<void>;
    onUnmarkCooked?: () => Promise<void>;
}

const stripEmoji = (value: string) =>
    value
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

const EnhancedRecipeCard: React.FC<EnhancedRecipeCardProps> = ({
    mealType,
    name,
    calories,
    protein,
    carbs,
    fat,
    benefit,
    onClick,
    mealPlanId,
    day,
    isCooked = false,
    onMarkCooked,
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [foodImage, setFoodImage] = useState<string | null>(null);
    const [cookingLoading, setCookingLoading] = useState(false);
    const retryCountRef = useRef(0);

    const fetchFoodImage = async (foodName: string, forceRefresh = false) => {
        setImageLoading(true);
        try {
            const url = forceRefresh
                ? await imageCache.refreshImage(foodName)
                : await imageCache.getImage(foodName);
            setFoodImage(url);
        } catch (error) {
            console.error('[EnhancedRecipeCard] Image fetch failed:', error);
            setFoodImage(null);
        } finally {
            setImageLoading(false);
        }
    };

    useEffect(() => {
        retryCountRef.current = 0;
        fetchFoodImage(name);
    }, [name]);

    const handleImageError = () => {
        const attempt = retryCountRef.current;
        if (attempt >= MAX_IMAGE_RETRIES) {
            setFoodImage(null);
            setImageLoading(false);
            return;
        }

        retryCountRef.current = attempt + 1;

        const variants = [name, `${name} dish`, `${name} meal`, `${mealType} ${name.split(' ').slice(0, 2).join(' ')}`];
        const nextQuery = variants[attempt] || name;

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
            breakfast: 'from-amber-50 to-amber-100 text-amber-700',
            lunch: 'from-[hsl(152_30%_94%)] to-[hsl(152_25%_88%)] text-leaf',
            dinner: 'from-[hsl(213_55%_94%)] to-[hsl(213_45%_88%)] text-primary',
            snack: 'from-secondary to-muted text-muted-foreground',
        };
        return styles[mealType] || styles.dinner;
    };

    const badge = getMealTypeBadge();
    const hasNutritionData = calories !== undefined && protein !== undefined;
    const showTrackingButton = mealPlanId && day && !!onMarkCooked;
    const cleanBenefit = benefit ? stripEmoji(benefit) : '';

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
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.6 },
                });

                Swal.fire({
                    title: 'Nice work',
                    text: `You cooked ${name}.`,
                    icon: 'success',
                    confirmButtonText: 'Continue',
                    confirmButtonColor: '#0E3E77',
                    timer: 2500,
                    timerProgressBar: true,
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Please try again in a moment.';
            console.error('[EnhancedRecipeCard] mark cooked failed:', err);
            Swal.fire({
                title: "Couldn't save your progress",
                text: message,
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#0E3E77',
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
            <div className="relative h-36 sm:h-40 md:h-44">
                {imageLoading ? (
                    <div className="absolute inset-0 bg-gradient-to-r from-muted via-secondary to-muted animate-pulse" />
                ) : foodImage ? (
                    <img
                        src={foodImage}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderStyle()} flex items-center justify-center`}>
                        <span className="text-xs font-medium opacity-70">No image available</span>
                    </div>
                )}
                {!imageLoading && (
                    <>
                        <div className={`absolute top-3 left-3 ${badge.bg} text-white text-xs font-semibold px-3 py-1.5 rounded-full`}>
                            {badge.text}
                        </div>
                        {hasNutritionData && calories !== undefined && (
                            <div className="absolute bottom-3 left-3 bg-foreground/70 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1.5 rounded-full">
                                {calories} kcal
                            </div>
                        )}

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
                                title={isCooked ? 'Already cooked' : 'Mark cooked'}
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
                <h3 className="text-sm sm:text-[15px] font-bold text-foreground mb-3 sm:mb-4 line-clamp-2 leading-snug">
                    {name}
                </h3>

                {hasNutritionData && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="rounded-xl bg-secondary border border-border px-2 py-2.5 text-center">
                            <div className="text-sm font-bold text-foreground">{protein}g</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Protein</div>
                        </div>
                        <div className="rounded-xl bg-secondary border border-border px-2 py-2.5 text-center">
                            <div className="text-sm font-bold text-foreground">{carbs}g</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Carbs</div>
                        </div>
                        <div className="rounded-xl bg-secondary border border-border px-2 py-2.5 text-center">
                            <div className="text-sm font-bold text-foreground">{fat}g</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Fats</div>
                        </div>
                    </div>
                )}

                {cleanBenefit && (
                    <p className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-snug">
                        {cleanBenefit}
                    </p>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    className="text-xs font-medium text-primary hover:underline transition-colors"
                >
                    View recipe details
                </button>
            </div>
        </div>
    );
};

export default EnhancedRecipeCard;
