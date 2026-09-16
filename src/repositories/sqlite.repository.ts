import {
  checkDatabaseHealth,
  createDish,
  deleteDish,
  deleteMeal,
  getDish,
  listDishes,
  listMeals,
  monthlyStats,
  recordMeal,
  updateDish,
  updateMealRating
} from '../db.js';
import { recommend } from '../recommend.js';

export const sqliteRepository = {
  checkHealth: checkDatabaseHealth,
  listDishes,
  getDish,
  createDish,
  updateDish,
  deleteDish,
  listMeals,
  recordMeal,
  updateMealRating,
  deleteMeal,
  monthlyStats,
  recommend
};
