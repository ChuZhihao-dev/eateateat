import { Router } from 'express';
import { apiController } from '../controllers/api.controller.js';

export const apiRouter = Router();

apiRouter.get('/meta', apiController.meta);
apiRouter.get('/dishes', apiController.listDishes);
apiRouter.get('/dishes/:id', apiController.getDish);
apiRouter.post('/dishes', apiController.createDish);
apiRouter.put('/dishes/:id', apiController.updateDish);
apiRouter.delete('/dishes/:id', apiController.deleteDish);
apiRouter.get('/recommend', apiController.recommend);
apiRouter.get('/meals', apiController.listMeals);
apiRouter.post('/meals', apiController.createMeal);
apiRouter.patch('/meals/:id', apiController.updateMealRating);
apiRouter.delete('/meals/:id', apiController.deleteMeal);
apiRouter.get('/stats', apiController.stats);
