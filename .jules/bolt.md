## 2024-05-21 - Memory learning
**Learning:** Found an existing constraint in memory - MealAttendance aggregations should calculate totals conditionally using 'mealSlot' (enum: 'breakfast', 'lunch', 'dinner'), 'isMealOn' (boolean), and 'extraMealCount' (number).
**Action:** Optimize nested loops in \`src/app/api/meal-attendance/route.ts\` when computing mealSummary.
