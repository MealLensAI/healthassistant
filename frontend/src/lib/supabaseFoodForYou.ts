import { safeGetItem } from '@/lib/utils'

export type FoodForYouMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FoodForYouItem = {
  id: string
  name: string
  mealType: FoodForYouMealType
  day: string
  ingredients: string[]
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  benefit?: string
}

export type FoodForYouRecord = {
  foods: FoodForYouItem[]
  updatedAt: string | null
}

const MEAL_TYPES: FoodForYouMealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const extractFoodName = (value?: string) => {
  if (!value) return ''
  return value.replace(/\s*\(buy:[^)]*\)/, '').trim()
}

const flattenMealPlanToFoods = (mealPlan: any[]): FoodForYouItem[] => {
  const foods: FoodForYouItem[] = []

  mealPlan.forEach((dayPlan, dayIndex) => {
    const day = dayPlan.day || `Day ${dayIndex + 1}`
    const meals: Array<{
      type: FoodForYouMealType
      name?: string
      ingredients?: string[]
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
      benefit?: string
    }> = [
      {
        type: 'breakfast',
        name: dayPlan.breakfast_name || dayPlan.breakfast,
        ingredients: dayPlan.breakfast_ingredients,
        calories: dayPlan.breakfast_calories,
        protein: dayPlan.breakfast_protein,
        carbs: dayPlan.breakfast_carbs,
        fat: dayPlan.breakfast_fat,
        benefit: dayPlan.breakfast_benefit,
      },
      {
        type: 'lunch',
        name: dayPlan.lunch_name || dayPlan.lunch,
        ingredients: dayPlan.lunch_ingredients,
        calories: dayPlan.lunch_calories,
        protein: dayPlan.lunch_protein,
        carbs: dayPlan.lunch_carbs,
        fat: dayPlan.lunch_fat,
        benefit: dayPlan.lunch_benefit,
      },
      {
        type: 'dinner',
        name: dayPlan.dinner_name || dayPlan.dinner,
        ingredients: dayPlan.dinner_ingredients,
        calories: dayPlan.dinner_calories,
        protein: dayPlan.dinner_protein,
        carbs: dayPlan.dinner_carbs,
        fat: dayPlan.dinner_fat,
        benefit: dayPlan.dinner_benefit,
      },
      {
        type: 'snack',
        name: dayPlan.snack_name || dayPlan.snack,
        ingredients: dayPlan.snack_ingredients,
        calories: dayPlan.snack_calories,
        protein: dayPlan.snack_protein,
        carbs: dayPlan.snack_carbs,
        fat: dayPlan.snack_fat,
        benefit: dayPlan.snack_benefit,
      },
    ]

    meals.forEach((meal) => {
      const name = extractFoodName(meal.name)
      if (!name) return
      foods.push({
        id: `${day}-${meal.type}-${name}`.toLowerCase().replace(/\s+/g, '-'),
        name,
        mealType: meal.type,
        day,
        ingredients: Array.isArray(meal.ingredients)
          ? meal.ingredients.filter(Boolean)
          : [],
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        benefit: meal.benefit,
      })
    })
  })

  return foods
}

const looksLikeMealPlan = (items: any[]) =>
  items.some(
    (item) =>
      item &&
      typeof item === 'object' &&
      (item.breakfast ||
        item.breakfast_name ||
        item.lunch ||
        item.lunch_name ||
        item.dinner ||
        item.dinner_name)
  )

const normalizeFoodItem = (item: any, index: number): FoodForYouItem | null => {
  const name = extractFoodName(item?.name)
  if (!name) return null
  const rawType = String(item.mealType || item.meal_type || 'lunch').toLowerCase()
  const mealType = MEAL_TYPES.includes(rawType as FoodForYouMealType)
    ? (rawType as FoodForYouMealType)
    : 'lunch'
  return {
    id: String(item.id || `${item.day || 'day'}-${mealType}-${name}-${index}`)
      .toLowerCase()
      .replace(/\s+/g, '-'),
    name,
    mealType,
    day: String(item.day || ''),
    ingredients: Array.isArray(item.ingredients) ? item.ingredients.filter(Boolean) : [],
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    benefit: item.benefit,
  }
}

const parseJson = (value: unknown) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export const normalizeFoodForYouFoods = (rawFoods: unknown, sourcePlan?: unknown): FoodForYouItem[] => {
  const foods = parseJson(rawFoods)
  if (Array.isArray(foods) && foods.length > 0) {
    if (looksLikeMealPlan(foods)) return flattenMealPlanToFoods(foods)
    return foods.map(normalizeFoodItem).filter((item): item is FoodForYouItem => Boolean(item))
  }

  const plan = parseJson(sourcePlan)
  if (Array.isArray(plan) && plan.length > 0) {
    return flattenMealPlanToFoods(plan)
  }

  return []
}

export async function fetchUserFoodForYou(userId: string): Promise<FoodForYouRecord> {
  const supabaseUrl = (
    import.meta.env.VITE_SUPABASE_URL || 'https://pklqumlzpklzroafmtrs.supabase.co'
  ).trim()
  const supabaseAnonKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrbHF1bWx6cGtsenJvYWZtdHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTcxNTIsImV4cCI6MjA2NzY5MzE1Mn0.eyzqg0hBZ5ZoPJKwGXPSKL96TJaPOX_p08dxt4FOn8g'
  ).trim()
  const token = safeGetItem('access_token') || safeGetItem('supabase_token')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  if (!token) {
    throw new Error('You must be signed in to view member Food for you.')
  }

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: 'foods,source_plan,updated_at',
    limit: '1',
  })
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/food_for_you?${params.toString()}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (response.status === 401 || response.status === 403) {
      throw new Error('Not allowed to view this member’s Food for you.')
    }
    throw new Error(body || `Failed to load Food for you (${response.status})`)
  }

  const rows = await response.json()
  const record = Array.isArray(rows) ? rows[0] : null
  if (!record) {
    return { foods: [], updatedAt: null }
  }

  return {
    foods: normalizeFoodForYouFoods(record.foods, record.source_plan),
    updatedAt: record.updated_at || null,
  }
}
