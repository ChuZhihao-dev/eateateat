import { z } from 'zod';

const mealType = z.enum(['breakfast', 'lunch', 'dinner']);
const mood = z.enum(['any', 'light', 'spicy', 'heavy', 'meat', 'veg', 'soup', 'lite']);
const nonNegativeInt = (max: number) => z.coerce.number().int().min(0).max(max);

export const idSchema = z.coerce.number().int().positive();

export const dishSchema = z.object({
  name: z.string().trim().min(1, '菜品名称不能为空').max(80),
  cuisine: z.string().trim().min(1).max(40).optional(),
  meals: z.array(mealType).min(1).max(3).optional(),
  tags: z.array(z.string().trim().min(1).max(20)).max(20).optional(),
  spice: nonNegativeInt(3).optional(),
  cook: nonNegativeInt(1_440).optional(),
  price: nonNegativeInt(10_000).optional(),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(100).optional()
});

export const recommendQuerySchema = z.object({
  meal: mealType.or(z.literal('any')).optional(),
  mood: mood.optional(),
  maxPrice: nonNegativeInt(10_000).optional(),
  maxCook: nonNegativeInt(1_440).optional(),
  ingredients: z.string().trim().max(1_000).optional(),
  avoidDays: nonNegativeInt(365).default(2),
  count: z.coerce.number().int().min(1).max(10).default(3)
});

export const mealCreateSchema = z.object({
  dish_id: idSchema,
  meal_type: mealType.optional(),
  rating: z.number().int().min(1).max(5).nullable().optional()
});

export const mealRatingSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable()
});

export const mealsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1_000).default(100)
});

export const statsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, '月份格式应为 YYYY-MM')
    .optional()
});
