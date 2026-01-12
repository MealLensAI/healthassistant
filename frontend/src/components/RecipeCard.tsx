import React, { useState, useEffect } from 'react';
import { imageCache } from '@/lib/imageCache';

interface RecipeCardProps {
  title: string;
  image?: string;
  time: string;
  rating: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onClick?: () => void;
  originalTitle?: string;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ title, image, mealType, onClick, originalTitle }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [foodImage, setFoodImage] = useState<string>('');

  const fetchFoodImage = async (foodName: string) => {
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

  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    fetchFoodImage(title);
  }, [title, image]);

  const getFallbackImage = () => {
    const fallbackImages: Record<string, string> = {
      breakfast: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
      lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
      dinner: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
      snack: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
    };
    return fallbackImages[mealType] || fallbackImages.dinner;
  };

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      fetchFoodImage(title + ' food');
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
              alt={title}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
            <div className={`absolute top-3 left-3 ${badge.bg} text-white text-xs font-semibold px-3 py-1.5 rounded-md`}>
              {badge.text}
            </div>
          </>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 mb-3 sm:mb-4 line-clamp-2 leading-snug">
          {originalTitle || title}
        </h3>

        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-200"
        >
          View Meal Details
        </button>
      </div>
    </div>
  );
};

export default RecipeCard;
