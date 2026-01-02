import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { imageCache } from '@/lib/imageCache';

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
    onClick
}) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [foodImage, setFoodImage] = useState<string>('');

    const fetchFoodImage = async (foodName: string) => {
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
    }, [name]);

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

    return (
        <div
            className="bg-white rounded-2xl overflow-hidden cursor-pointer group border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
            onClick={onClick}
        >
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
                            <div className="absolute bottom-3 right-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                {calories}kcal
                            </div>
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
                    className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-200"
                >
                    View Meal Details
                </button>
            </div>
        </div>
    );
};

export default EnhancedRecipeCard;
