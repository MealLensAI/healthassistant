import React from 'react'
import { X } from 'lucide-react'

interface HealthMeal {
  calories: number
  carbs: number
  fat: number
  fiber: number
  food_suggestions: string[]
  health_benefit: string
  ingredients_used: string[]
  protein: number
}

interface MealDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  meal: HealthMeal | null
  onGetCookingInstructions: () => void
}

const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  isOpen,
  onClose,
  meal,
  onGetCookingInstructions
}) => {
  if (!isOpen || !meal) return null

  const mealName = meal.food_suggestions?.[0] || "Health Meal"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{mealName}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Health Benefit */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Health Benefit:</h3>
          <p className="text-gray-600 leading-relaxed">{meal.health_benefit}</p>
        </div>

        {/* Nutrition Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Nutrition Information:</h3>
          
          {/* Nutrition Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Calories */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{meal.calories}</p>
              <p className="text-sm text-orange-500 font-medium">Calories</p>
            </div>

            {/* Protein */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{meal.protein}g</p>
              <p className="text-sm text-blue-500 font-medium">Protein</p>
            </div>

            {/* Carbs */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{meal.carbs}g</p>
              <p className="text-sm text-green-500 font-medium">Carbs</p>
            </div>

            {/* Fat */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{meal.fat}g</p>
              <p className="text-sm text-purple-500 font-medium">Fat</p>
            </div>
          </div>
        </div>

        {/* Ingredients Used */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Ingredients Used:</h3>
          <div className="space-y-2">
            {meal.ingredients_used.map((ingredient, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-700">{ingredient}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Get Cooking Instructions Button */}
        <button
          onClick={onGetCookingInstructions}
          className="w-full py-4 bg-[#1A76E3] text-white rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200 shadow-lg"
        >
          Get Cooking Instructions
        </button>
      </div>
    </div>
  )
}

export default MealDetailsModal