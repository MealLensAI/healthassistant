/** In-memory Food for you cache (cleared on logout). */
export type FoodForYouMemoryItem = {
  id: string
  name: string
  mealType: string
  day: string
  ingredients: string[]
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  benefit?: string
}

let foodForYouMemory: { userId: string; foods: FoodForYouMemoryItem[] } | null = null

export const getFoodForYouMemory = () => foodForYouMemory

export const setFoodForYouMemory = (
  userId: string,
  foods: FoodForYouMemoryItem[],
) => {
  foodForYouMemory = foods.length > 0 ? { userId, foods } : null
}

export const clearFoodForYouMemory = () => {
  foodForYouMemory = null
}
