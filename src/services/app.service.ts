import type { z } from 'zod';
import {
  dishSchema,
  mealCreateSchema,
  mealRatingSchema,
  mealsQuerySchema,
  recommendQuerySchema,
  statsQuerySchema
} from '../api/schemas.js';
import { sqliteRepository } from '../repositories/sqlite.repository.js';
import { mealTypeByHour } from '../recommend.js';

type DishInput = z.infer<typeof dishSchema>;
type MealInput = z.infer<typeof mealCreateSchema>;

export const appService = {
  listDishes: () => sqliteRepository.listDishes(),
  getDish: (id: number) => sqliteRepository.getDish(id),
  createDish: (input: DishInput) => sqliteRepository.createDish(input),
  updateDish: (id: number, input: DishInput) => sqliteRepository.updateDish(id, input),
  deleteDish: (id: number) => sqliteRepository.deleteDish(id),
  listMeals: (query: z.infer<typeof mealsQuerySchema>) => sqliteRepository.listMeals(query),
  recordMeal: (input: MealInput) =>
    sqliteRepository.recordMeal({
      dish_id: input.dish_id,
      meal_type: input.meal_type || 'lunch',
      rating: input.rating ?? null
    } as never),
  updateMealRating: (id: number, input: z.infer<typeof mealRatingSchema>) =>
    sqliteRepository.updateMealRating(id, input.rating),
  deleteMeal: (id: number) => sqliteRepository.deleteMeal(id),
  stats: (query: z.infer<typeof statsQuerySchema>) => sqliteRepository.monthlyStats(query.month),
  recommend: (query: z.infer<typeof recommendQuerySchema>) =>
    sqliteRepository.recommend({
      meal: query.meal || mealTypeByHour(),
      mood: query.mood || 'any',
      maxPrice: query.maxPrice,
      maxCook: query.maxCook,
      ingredients: query.ingredients ? query.ingredients.split(/[,，\s]+/).filter(Boolean) : [],
      avoidDays: query.avoidDays,
      count: query.count
    }),
  isReady: () => sqliteRepository.checkHealth()
};
