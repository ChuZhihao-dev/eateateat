import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../api/errors.js';
import {
  dishSchema,
  idSchema,
  mealCreateSchema,
  mealRatingSchema,
  mealsQuerySchema,
  recommendQuerySchema,
  statsQuerySchema
} from '../api/schemas.js';
import { MOODS, mealTypeByHour } from '../recommend.js';
import { appService } from '../services/app.service.js';

type Handler = (req: Request, res: Response, next: NextFunction) => void;

export const route =
  (handler: Handler): Handler =>
  (req, res, next) => {
    try {
      handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };

const pathId = (req: Request) => idSchema.parse(req.params.id);

export const apiController = {
  meta: route((_req, res) => {
    res.json({
      moods: Object.values(MOODS),
      suggestedMeal: mealTypeByHour(),
      meals: [
        { key: 'breakfast', label: '早餐' },
        { key: 'lunch', label: '午餐' },
        { key: 'dinner', label: '晚餐' },
        { key: 'any', label: '不限' }
      ]
    });
  }),
  listDishes: route((_req, res) => res.json(appService.listDishes())),
  getDish: route((req, res) => {
    const dish = appService.getDish(pathId(req));
    if (!dish) throw new ApiError(404, 'DISH_NOT_FOUND', '菜品不存在');
    res.json(dish);
  }),
  createDish: route((req, res) =>
    res.status(201).json(appService.createDish(dishSchema.parse(req.body)))
  ),
  updateDish: route((req, res) => {
    const dish = appService.updateDish(pathId(req), dishSchema.parse(req.body));
    if (!dish) throw new ApiError(404, 'DISH_NOT_FOUND', '菜品不存在');
    res.json(dish);
  }),
  deleteDish: route((req, res) => {
    if (!appService.deleteDish(pathId(req)))
      throw new ApiError(404, 'DISH_NOT_FOUND', '菜品不存在');
    res.status(204).end();
  }),
  recommend: route((req, res) =>
    res.json(appService.recommend(recommendQuerySchema.parse(req.query)))
  ),
  listMeals: route((req, res) => res.json(appService.listMeals(mealsQuerySchema.parse(req.query)))),
  createMeal: route((req, res) => {
    const meal = appService.recordMeal(mealCreateSchema.parse(req.body));
    if (!meal) throw new ApiError(404, 'DISH_NOT_FOUND', '菜品不存在');
    res.status(201).json(meal);
  }),
  updateMealRating: route((req, res) => {
    const meal = appService.updateMealRating(pathId(req), mealRatingSchema.parse(req.body));
    if (!meal) throw new ApiError(404, 'MEAL_NOT_FOUND', '记录不存在');
    res.json(meal);
  }),
  deleteMeal: route((req, res) => {
    if (!appService.deleteMeal(pathId(req)))
      throw new ApiError(404, 'MEAL_NOT_FOUND', '记录不存在');
    res.status(204).end();
  }),
  stats: route((req, res) => res.json(appService.stats(statsQuerySchema.parse(req.query)))),
  ready: route((_req, res) => {
    appService.isReady();
    res.json({ status: 'ready', requestId: res.locals.requestId });
  })
};

export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}
