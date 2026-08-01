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

const stripEmoji = (value: string) =>
  value
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

const MealDetailsModal: React.FC<MealDetailsModalProps> = ({
  isOpen,
  onClose,
  meal,
  onGetCookingInstructions
}) => {
  if (!isOpen || !meal) return null

  const mealName = meal.food_suggestions?.[0] || "Health Meal"
  const benefit = stripEmoji(meal.health_benefit || '')

  const nutrition = [
    { label: 'Calories', value: `${meal.calories}` },
    { label: 'Protein', value: `${meal.protein}g` },
    { label: 'Carbs', value: `${meal.carbs}g` },
    { label: 'Fat', value: `${meal.fat}g` },
  ]

  return (
    <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto border border-border shadow-elevated">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 className="font-display text-xl font-bold text-foreground tracking-tight">
            {mealName}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {benefit && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf mb-2">
              Health benefit
            </h3>
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              {benefit}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf mb-3">
            Nutrition
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {nutrition.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-secondary px-4 py-4 text-center"
              >
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf mb-3">
            Ingredients
          </h3>
          <ul className="space-y-2.5">
            {meal.ingredients_used.map((ingredient, index) => (
              <li key={index} className="flex items-start gap-3 text-[15px] text-foreground">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onGetCookingInstructions}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-blue-deep transition-colors"
        >
          Get cooking instructions
        </button>
      </div>
    </div>
  )
}

export default MealDetailsModal
