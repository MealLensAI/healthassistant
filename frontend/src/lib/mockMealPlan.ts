import type { MealPlan, SavedMealPlan } from '@/hooks/useMealPlans';

export const DEMO_PLAN_ID = 'demo-high-blood-sugar';
export const DEMO_PLAN_FLAG_KEY = 'meallensai_show_demo_plan';

const getMondayOfCurrentWeek = (): Date => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatISODate = (date: Date) => date.toISOString().split('T')[0];

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// NOTE: we intentionally do NOT set `*_image` fields on any day.
// Leaving them undefined causes RecipeCard / EnhancedRecipeCard to fetch
// images through the regular `imageCache.getImage(foodName, ...)` pipeline
// (our normal get-image API), just like any AI-generated plan.
const DEMO_MEAL_PLAN_DAYS: MealPlan[] = [
  {
    day: 'Monday',
    breakfast: 'Steel-cut oatmeal with chia seeds, cinnamon & fresh berries',
    breakfast_name: 'Steel-cut oatmeal with chia seeds, cinnamon & fresh berries',
    breakfast_ingredients: ['½ cup steel-cut oats', '1 tbsp chia seeds', '¼ tsp cinnamon', '½ cup mixed berries', '1 cup unsweetened almond milk'],
    breakfast_calories: 320,
    breakfast_protein: 12,
    breakfast_carbs: 45,
    breakfast_fat: 9,
    breakfast_benefit: 'Low glycemic index; soluble fiber and cinnamon help slow glucose absorption.',

    lunch: 'Grilled chicken & quinoa bowl with leafy greens and avocado',
    lunch_name: 'Grilled chicken & quinoa bowl with leafy greens and avocado',
    lunch_ingredients: ['120g grilled chicken breast', '½ cup cooked quinoa', '2 cups spinach & kale', '¼ avocado', '1 tbsp olive oil & lemon dressing'],
    lunch_calories: 480,
    lunch_protein: 38,
    lunch_carbs: 32,
    lunch_fat: 20,
    lunch_benefit: 'Lean protein + complex carbs keep blood sugar stable after meals.',

    dinner: 'Baked salmon with roasted broccoli and wild rice',
    dinner_name: 'Baked salmon with roasted broccoli and wild rice',
    dinner_ingredients: ['140g salmon fillet', '1½ cups broccoli florets', '½ cup wild rice', '1 tbsp olive oil', 'Garlic, lemon, herbs'],
    dinner_calories: 520,
    dinner_protein: 36,
    dinner_carbs: 38,
    dinner_fat: 22,
    dinner_benefit: 'Omega-3 fats reduce inflammation and improve insulin sensitivity.',

    snack: 'Greek yogurt with walnuts & a few blueberries',
    snack_name: 'Greek yogurt with walnuts & a few blueberries',
    snack_ingredients: ['¾ cup plain Greek yogurt', '1 tbsp walnuts', '¼ cup blueberries'],
    snack_calories: 180,
    snack_protein: 15,
    snack_carbs: 12,
    snack_fat: 8,
    snack_benefit: 'Protein + healthy fats prevent mid-afternoon blood sugar spikes.',
  },
  {
    day: 'Tuesday',
    breakfast: 'Vegetable omelette with whole-grain toast & avocado',
    breakfast_name: 'Vegetable omelette with whole-grain toast & avocado',
    breakfast_ingredients: ['2 eggs', 'Spinach, tomato, bell pepper', '1 slice whole-grain bread', '¼ avocado'],
    breakfast_calories: 340,
    breakfast_protein: 20,
    breakfast_carbs: 24,
    breakfast_fat: 18,
    breakfast_benefit: 'High protein breakfast keeps morning glucose steady.',

    lunch: 'Lentil soup with mixed-green salad',
    lunch_name: 'Lentil soup with mixed-green salad',
    lunch_ingredients: ['1 cup lentil soup (low sodium)', 'Mixed greens', 'Cucumber, tomato', '1 tbsp olive oil vinaigrette'],
    lunch_calories: 420,
    lunch_protein: 22,
    lunch_carbs: 50,
    lunch_fat: 12,
    lunch_benefit: 'Legumes are rich in fiber and have a very low glycemic index.',

    dinner: 'Turkey stir-fry with mixed vegetables over cauliflower rice',
    dinner_name: 'Turkey stir-fry with mixed vegetables over cauliflower rice',
    dinner_ingredients: ['120g lean turkey', 'Broccoli, bell pepper, snap peas', '1 cup cauliflower rice', 'Ginger-garlic sauce (low sodium)'],
    dinner_calories: 460,
    dinner_protein: 34,
    dinner_carbs: 28,
    dinner_fat: 18,
    dinner_benefit: 'Cauliflower rice lowers total carb load while keeping the meal satisfying.',

    snack: 'Apple slices with 1 tbsp almond butter',
    snack_name: 'Apple slices with 1 tbsp almond butter',
    snack_ingredients: ['1 small apple', '1 tbsp almond butter'],
    snack_calories: 180,
    snack_protein: 4,
    snack_carbs: 22,
    snack_fat: 9,
    snack_benefit: 'Pairing fruit with nut butter slows the sugar release.',
  },
  {
    day: 'Wednesday',
    breakfast: 'Greek yogurt parfait with chia, flax and strawberries',
    breakfast_name: 'Greek yogurt parfait with chia, flax and strawberries',
    breakfast_ingredients: ['1 cup plain Greek yogurt', '1 tbsp chia seeds', '1 tsp flax seeds', '½ cup strawberries'],
    breakfast_calories: 310,
    breakfast_protein: 24,
    breakfast_carbs: 28,
    breakfast_fat: 10,
    breakfast_benefit: 'Protein-forward start with minimal added sugar.',

    lunch: 'Chickpea & roasted-vegetable salad with tahini dressing',
    lunch_name: 'Chickpea & roasted-vegetable salad with tahini dressing',
    lunch_ingredients: ['½ cup chickpeas', 'Roasted zucchini, peppers, carrots', 'Mixed greens', '1 tbsp tahini dressing'],
    lunch_calories: 430,
    lunch_protein: 18,
    lunch_carbs: 48,
    lunch_fat: 18,
    lunch_benefit: 'Plant protein and fiber improve post-meal glucose response.',

    dinner: 'Grilled chicken with sautéed spinach and sweet potato',
    dinner_name: 'Grilled chicken with sautéed spinach and sweet potato',
    dinner_ingredients: ['140g grilled chicken', '2 cups spinach (sautéed in olive oil)', '½ medium sweet potato'],
    dinner_calories: 500,
    dinner_protein: 40,
    dinner_carbs: 36,
    dinner_fat: 18,
    dinner_benefit: 'Sweet potato is a lower-GI alternative to white potato.',

    snack: 'Cucumber & carrot sticks with hummus',
    snack_name: 'Cucumber & carrot sticks with hummus',
    snack_ingredients: ['1 cup cucumber & carrot sticks', '2 tbsp hummus'],
    snack_calories: 140,
    snack_protein: 5,
    snack_carbs: 16,
    snack_fat: 7,
    snack_benefit: 'Low-carb, high-fiber snack — gentle on blood sugar.',
  },
  {
    day: 'Thursday',
    breakfast: 'Scrambled eggs with sautéed mushrooms & tomato',
    breakfast_name: 'Scrambled eggs with sautéed mushrooms & tomato',
    breakfast_ingredients: ['2 eggs', '½ cup mushrooms', '½ cup cherry tomatoes', '1 slice whole-grain bread'],
    breakfast_calories: 300,
    breakfast_protein: 20,
    breakfast_carbs: 22,
    breakfast_fat: 14,
    breakfast_benefit: 'Eggs provide complete protein with almost zero carbs.',

    lunch: 'Tuna salad with mixed greens and olive oil',
    lunch_name: 'Tuna salad with mixed greens and olive oil',
    lunch_ingredients: ['1 can tuna in water', 'Mixed greens', 'Cucumber, tomato, olives', '1 tbsp olive oil + lemon'],
    lunch_calories: 410,
    lunch_protein: 34,
    lunch_carbs: 14,
    lunch_fat: 22,
    lunch_benefit: 'Very low carb load — ideal for post-lunch glucose control.',

    dinner: 'Baked cod with quinoa pilaf and green beans',
    dinner_name: 'Baked cod with quinoa pilaf and green beans',
    dinner_ingredients: ['140g cod fillet', '½ cup quinoa', '1 cup green beans', 'Lemon, garlic, herbs'],
    dinner_calories: 470,
    dinner_protein: 36,
    dinner_carbs: 34,
    dinner_fat: 14,
    dinner_benefit: 'Lean white fish + whole grain supports balanced evening glucose.',

    snack: 'Handful of mixed nuts (unsalted)',
    snack_name: 'Handful of mixed nuts (unsalted)',
    snack_ingredients: ['¼ cup unsalted mixed nuts'],
    snack_calories: 180,
    snack_protein: 6,
    snack_carbs: 7,
    snack_fat: 16,
    snack_benefit: 'Nuts have minimal impact on blood sugar and keep you full.',
  },
  {
    day: 'Friday',
    breakfast: 'Spinach & berry protein smoothie',
    breakfast_name: 'Spinach & berry protein smoothie',
    breakfast_ingredients: ['1 cup spinach', '½ cup mixed berries', '1 cup unsweetened almond milk', '½ cup Greek yogurt', '1 tbsp chia seeds'],
    breakfast_calories: 280,
    breakfast_protein: 20,
    breakfast_carbs: 26,
    breakfast_fat: 9,
    breakfast_benefit: 'No added sugar and high in protein and fiber.',

    lunch: 'Grilled chicken wrap with veggies & hummus',
    lunch_name: 'Grilled chicken wrap with veggies & hummus',
    lunch_ingredients: ['1 small whole-grain wrap', '100g grilled chicken', 'Lettuce, tomato, cucumber', '2 tbsp hummus'],
    lunch_calories: 440,
    lunch_protein: 32,
    lunch_carbs: 38,
    lunch_fat: 16,
    lunch_benefit: 'Whole-grain wrap + protein prevents afternoon glucose crashes.',

    dinner: 'Lean beef & vegetable skewers with side salad',
    dinner_name: 'Lean beef & vegetable skewers with side salad',
    dinner_ingredients: ['120g lean beef', 'Bell pepper, onion, zucchini', 'Mixed green salad', '1 tbsp olive-oil vinaigrette'],
    dinner_calories: 490,
    dinner_protein: 38,
    dinner_carbs: 22,
    dinner_fat: 26,
    dinner_benefit: 'Low-carb dinner supports stable overnight glucose.',

    snack: 'Boiled egg and cherry tomatoes',
    snack_name: 'Boiled egg and cherry tomatoes',
    snack_ingredients: ['1 boiled egg', '½ cup cherry tomatoes'],
    snack_calories: 110,
    snack_protein: 8,
    snack_carbs: 5,
    snack_fat: 6,
    snack_benefit: 'High-protein, low-carb snack — nearly zero blood sugar impact.',
  },
  {
    day: 'Saturday',
    breakfast: 'Chia pudding with almond milk, cinnamon & walnuts',
    breakfast_name: 'Chia pudding with almond milk, cinnamon & walnuts',
    breakfast_ingredients: ['3 tbsp chia seeds', '1 cup unsweetened almond milk', '¼ tsp cinnamon', '1 tbsp walnuts'],
    breakfast_calories: 290,
    breakfast_protein: 9,
    breakfast_carbs: 22,
    breakfast_fat: 18,
    breakfast_benefit: 'Chia + cinnamon slow down carb absorption overnight.',

    lunch: 'Shrimp & avocado salad',
    lunch_name: 'Shrimp & avocado salad',
    lunch_ingredients: ['120g cooked shrimp', '¼ avocado', 'Mixed greens', 'Cherry tomatoes', '1 tbsp olive oil dressing'],
    lunch_calories: 400,
    lunch_protein: 28,
    lunch_carbs: 14,
    lunch_fat: 24,
    lunch_benefit: 'Healthy fats improve insulin sensitivity.',

    dinner: 'Stuffed bell peppers with lean ground turkey & quinoa',
    dinner_name: 'Stuffed bell peppers with lean ground turkey & quinoa',
    dinner_ingredients: ['2 bell peppers', '100g lean ground turkey', '⅓ cup cooked quinoa', 'Tomato, onion, herbs'],
    dinner_calories: 470,
    dinner_protein: 34,
    dinner_carbs: 32,
    dinner_fat: 18,
    dinner_benefit: 'Balanced plate with lean protein, whole grain and vegetables.',

    snack: 'Cottage cheese with raspberries',
    snack_name: 'Cottage cheese with raspberries',
    snack_ingredients: ['½ cup low-fat cottage cheese', '¼ cup raspberries'],
    snack_calories: 130,
    snack_protein: 14,
    snack_carbs: 10,
    snack_fat: 3,
    snack_benefit: 'High-protein dairy snack with minimal sugar.',
  },
  {
    day: 'Sunday',
    breakfast: 'Oat-flour pancakes with berries & Greek yogurt',
    breakfast_name: 'Oat-flour pancakes with berries & Greek yogurt',
    breakfast_ingredients: ['½ cup oat flour', '1 egg', '½ cup unsweetened almond milk', '¼ cup Greek yogurt', '¼ cup berries'],
    breakfast_calories: 340,
    breakfast_protein: 18,
    breakfast_carbs: 38,
    breakfast_fat: 12,
    breakfast_benefit: 'Oat flour is lower-GI than refined wheat flour.',

    lunch: 'Quinoa tabbouleh with grilled chicken',
    lunch_name: 'Quinoa tabbouleh with grilled chicken',
    lunch_ingredients: ['½ cup cooked quinoa', '120g grilled chicken', 'Parsley, mint, tomato, cucumber', '1 tbsp olive oil + lemon'],
    lunch_calories: 450,
    lunch_protein: 34,
    lunch_carbs: 34,
    lunch_fat: 16,
    lunch_benefit: 'Herbs and whole grains support stable afternoon glucose.',

    dinner: 'Grilled fish with steamed vegetables and brown rice',
    dinner_name: 'Grilled fish with steamed vegetables and brown rice',
    dinner_ingredients: ['140g white fish', '1 cup steamed vegetables', '⅓ cup brown rice', 'Lemon, herbs'],
    dinner_calories: 460,
    dinner_protein: 34,
    dinner_carbs: 36,
    dinner_fat: 14,
    dinner_benefit: 'Portion-controlled whole grain with lean protein and fiber.',

    snack: 'Pear slices with cheddar',
    snack_name: 'Pear slices with cheddar',
    snack_ingredients: ['1 small pear', '20g cheddar cheese'],
    snack_calories: 170,
    snack_protein: 6,
    snack_carbs: 22,
    snack_fat: 7,
    snack_benefit: 'Pairing fruit with protein smooths the glucose curve.',
  },
];

export const buildDemoMealPlan = (): SavedMealPlan => {
  const monday = getMondayOfCurrentWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const now = new Date().toISOString();

  return {
    id: DEMO_PLAN_ID,
    name: `${formatDisplayDate(monday)} - ${formatDisplayDate(sunday)} (Sample)`,
    startDate: formatISODate(monday),
    endDate: formatISODate(sunday),
    mealPlan: DEMO_MEAL_PLAN_DAYS,
    createdAt: now,
    updatedAt: now,
    hasSickness: true,
    sicknessType: 'High Blood Sugar (Diabetes)',
    healthAssessment: {
      whtr: 0.5,
      whtr_category: 'Healthy range',
      bmr: 1600,
      daily_calories: 2000,
    },
  };
};

export const isDemoPlan = (plan: { id?: string } | null | undefined) =>
  !!plan && plan.id === DEMO_PLAN_ID;
