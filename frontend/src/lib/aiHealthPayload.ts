/** Normalize health-profile fields for the MealLens AI service. */

const AI_GOALS = new Set(['heal', 'maintain'])
const AI_ACTIVITY = new Set(['sedentary', 'light', 'moderate', 'active'])

/** AI `/ai_nutrition_plan` only accepts heal | maintain. */
export function mapGoalToBackendFormat(goal: string | undefined): string {
  if (!goal) return 'heal'
  const normalizedGoal = goal.trim()
  const goalMap: Record<string, string> = {
    Heal: 'heal',
    Improve: 'heal',
    Manage: 'heal',
    Restore: 'heal',
    Maintain: 'maintain',
    heal: 'heal',
    improve: 'heal',
    manage: 'heal',
    restore: 'heal',
    maintain: 'maintain',
    'Heal Health Condition': 'heal',
    'Improve Health Condition': 'heal',
    'Manage Health Condition': 'heal',
    'Restore Health Condition': 'heal',
    'Maintain Health Condition': 'maintain',
    'Heal & Manage Condition': 'heal',
    'Maintain Health': 'maintain',
    // Legacy fitness goals — AI nutrition plan rejects these with HTTP 400.
    lose_weight: 'heal',
    gain_weight: 'heal',
    improve_fitness: 'heal',
  }
  if (goalMap[normalizedGoal]) return goalMap[normalizedGoal]
  const lowerGoal = normalizedGoal.toLowerCase()
  for (const [key, value] of Object.entries(goalMap)) {
    if (key.toLowerCase() === lowerGoal) return value
  }
  if (lowerGoal.includes('maintain')) return 'maintain'
  if (AI_GOALS.has(lowerGoal)) return lowerGoal
  return 'heal'
}

/**
 * AI accepts: sedentary | light | moderate | active.
 * Profile UI also offers `very_active` — map that up so dietitian meal plans
 * do not 400 on `/ai_nutrition_plan`.
 */
export function mapActivityLevelToBackend(level: string | undefined): string {
  if (!level) return 'moderate'
  const raw = level.trim().toLowerCase().replace(/\s+/g, '_')
  const activityMap: Record<string, string> = {
    sedentary: 'sedentary',
    light: 'light',
    lightly_active: 'light',
    light_active: 'light',
    moderate: 'moderate',
    moderately_active: 'moderate',
    moderate_active: 'moderate',
    active: 'active',
    very_active: 'active',
    veryactive: 'active',
    'very-active': 'active',
  }
  const mapped = activityMap[raw] || activityMap[raw.replace(/-/g, '_')]
  if (mapped && AI_ACTIVITY.has(mapped)) return mapped
  if (AI_ACTIVITY.has(raw)) return raw
  return 'moderate'
}

export function normalizeCondition(condition: string | undefined): string {
  const cleaned = (condition || '').trim()
  if (!cleaned || /^no health condition$/i.test(cleaned) || /^none$/i.test(cleaned) || /^general$/i.test(cleaned)) {
    return 'general'
  }
  return cleaned
}
