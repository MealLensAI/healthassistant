# Food for you — DB-backed recommendations

## Summary
Personalized "Food for you" recommendations are stored 1:1 per user in `food_for_you`. The page loads from the DB first and only calls the AI when the row is empty or the user taps Regenerate. Saving a health profile clears the row so the next visit regenerates.

## Table
- `food_for_you`: `id`, `user_id` (UNIQUE), `foods` (JSON), `source_plan` (JSON), timestamps
- Migration: `backend/migrations/021_food_for_you.sql`

## API
- `GET /api/food-for-you`
- `PUT /api/food-for-you` — body `{ foods, source_plan? }`
- `DELETE /api/food-for-you`

## Frontend
- `FoodForYouPage` loads DB → generate if empty → save
- Refresh renamed to Regenerate (force AI + upsert)
- Health profile save clears Food for you (backend)
