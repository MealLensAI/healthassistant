import React, { useState, useEffect } from 'react';
import { Flame, Check, ChefHat, Loader2 } from 'lucide-react';
import { imageCache } from '@/lib/imageCache';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';

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
    image?: string;
    mealPlanId?: string | null;
    day?: string;
    isCooked?: boolean;
    onMarkCooked?: () => Promise<void>;
    onUnmarkCooked?: () => Promise<void>;
}

const EnhancedRecipeCard: React.FC<EnhancedRecipeCardProps> = ({
    mealType,
    name,
    ingredients,
    calories,
    protein,
    carbs,
    fat,
    benefit,
    onClick,
    image,
    mealPlanId,
    day,
    isCooked = false,
    onMarkCooked,
    onUnmarkCooked,
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [foodImage, setFoodImage] = useState<string>('');
    const [cookingLoading, setCookingLoading] = useState(false);

    const fetchFoodImage = async (foodName: string) => {
        // If image is provided (stored in DB), use it directly
        if (image) {
            setFoodImage(image);
            setImageLoading(false);
            return;
        }

        try {
            const fallback = getFallbackImage();
            const cachedImage = await imageCache.getImage(foodName, fallback);
            setFoodImage(cachedImage);
        } catch (error) {
            setFoodImage(getFallbackImage());
        } finally {
            setImageLoading(false);
        }
    };

    const getFallbackImage = () => {
        const fallbackImages: Record<string, string> = {
            breakfast: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
            lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
            dinner: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
            snack: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
        };
        return fallbackImages[mealType] || fallbackImages.dinner;
    };

    useEffect(() => {
        setImageLoading(true);
        setImageError(false);
        fetchFoodImage(name);
    }, [name, image]);

    const handleImageError = () => {
        if (!imageError) {
            setImageError(true);
            fetchFoodImage(name + ' food');
        } else {
            setFoodImage(getFallbackImage());
            setImageLoading(false);
        }
    };

    const getMealTypeBadge = () => {
        const badges: Record<string, { bg: string; text: string }> = {
            breakfast: { bg: 'bg-amber-500', text: 'Breakfast' },
            lunch: { bg: 'bg-green-500', text: 'Lunch' },
            dinner: { bg: 'bg-blue-500', text: 'Dinner' },
            snack: { bg: 'bg-purple-500', text: 'Desert' }
        };
        return badges[mealType] || badges.dinner;
    };

    const badge = getMealTypeBadge();
    const hasNutritionData = calories !== undefined && protein !== undefined;
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
                    origin: { y: 0.6 }
                });

                Swal.fire({
                    title: 'Congratulations!',
                    text: `You cooked ${name}!`,
                    icon: 'success',
                    confirmButtonText: 'Awesome!',
                    confirmButtonColor: '#4CAF50',
                    timer: 3000,
                    timerProgressBar: true
                });

            }
        } finally {
            setCookingLoading(false);
        }
    };

    return (
        <div
            className={`bg-white rounded-2xl overflow-hidden cursor-pointer group border shadow-sm hover:shadow-xl transition-all duration-300 ${
                isCooked ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100'
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
                ) : (
                    <>
                        <img
                            src={foodImage || getFallbackImage()}
                            alt={name}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                        />
                        <div className={`absolute top-3 left-3 ${badge.bg} text-white text-xs font-semibold px-3 py-1.5 rounded-md`}>
                            {badge.text}
                        </div>
                        {hasNutritionData && calories && (
                            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                {calories}kcal
                            </div>
                        )}

                        {/* Floating Action Button for Cooking */}
                        {showTrackingButton && (
                            <button
                                onClick={handleCookToggle}
                                disabled={cookingLoading || isCooked}
                                className={`absolute bottom-3 right-3 shadow-xl flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all duration-300 z-10 ${
                                    triggerPop 
                                        ? 'scale-125 bg-green-500 text-white ring-4 ring-green-200' 
                                        : isCooked 
                                            ? 'bg-green-500 text-white ring-2 ring-white cursor-default' 
                                            : 'animate-heartbeat hover:animate-none hover:scale-110 bg-white text-gray-800 hover:text-green-600 ring-2 ring-green-100'
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
                                    <>
                                        <ChefHat className="w-4 h-4" />
                                        <span>Mark cooked</span>
                                    </>
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>

            <div className="p-4 sm:p-5">
                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 mb-3 sm:mb-4 line-clamp-2 leading-snug">{name}</h3>

                {hasNutritionData && (
                    <div className="flex gap-2 sm:gap-3 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
                        {/* Protein */}
                        <div className="w-[55px] min-w-[55px] sm:w-[69px] sm:min-w-[69px] h-[65px] sm:h-[75px] bg-[#FEF5EF] rounded-[8px] sm:rounded-[10px] p-2 sm:p-4 flex flex-col items-center justify-center gap-[2px] border border-[#FDE8DC] flex-shrink-0">
                            <div className="text-sm sm:text-base">🍖</div>
                            <div className="text-xs sm:text-sm font-bold text-gray-800">{protein}g</div>
                            <div className="text-[10px] sm:text-xs text-gray-500">Protein</div>
                        </div>
                        {/* Carbs */}
                        <div className="w-[55px] min-w-[55px] sm:w-[69px] sm:min-w-[69px] h-[65px] sm:h-[75px] bg-[#FEF5EF] rounded-[8px] sm:rounded-[10px] p-2 sm:p-4 flex flex-col items-center justify-center gap-[2px] border border-[#FDE8DC] flex-shrink-0">
                            <div className="text-sm sm:text-base">🌾</div>
                            <div className="text-xs sm:text-sm font-bold text-gray-800">{carbs}g</div>
                            <div className="text-[10px] sm:text-xs text-gray-500">Carbs</div>
                        </div>
                        {/* Fats */}
                        <div className="w-[55px] min-w-[55px] sm:w-[69px] sm:min-w-[69px] h-[65px] sm:h-[75px] bg-[#FEF5EF] rounded-[8px] sm:rounded-[10px] p-2 sm:p-4 flex flex-col items-center justify-center gap-[2px] border border-[#FDE8DC] flex-shrink-0">
                            <div className="text-sm sm:text-base">💧</div>
                            <div className="text-xs sm:text-sm font-bold text-gray-800">{fat}g</div>
                            <div className="text-[10px] sm:text-xs text-gray-500">Fats</div>
                        </div>
                    </div>
                )}

                {benefit && (
                    <div className="mb-3 sm:mb-4 flex items-start gap-2 text-xs sm:text-sm text-orange-600">
                        <span className="flex-shrink-0">🚀</span>
                        <span className="line-clamp-2 leading-snug">{benefit}</span>
                    </div>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    className="text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline transition-colors"
                >
                    View Recipe Details
                </button>
            </div>
        </div>
    );
};

export default EnhancedRecipeCard;
