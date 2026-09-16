import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { networkInterfaces } from 'node:os';
import {
  listDishes,
  getDish,
  createDish,
  updateDish,
  deleteDish,
  recordMeal,
  listMeals,
  updateMealRating,
  deleteMeal,
  monthlyStats
} from './src/db.js';
import { recommend, MOODS, mealTypeByHour } from './src/recommend.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

function asyncRoute(fn) {
  return (req, res, next) => {
    try {
      fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

// ---------- 元信息 ----------
app.get('/api/meta', (req, res) => {
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
});

// ---------- 菜品 CRUD ----------
app.get('/api/dishes', asyncRoute((req, res) => {
  res.json(listDishes());
}));

app.get('/api/dishes/:id', asyncRoute((req, res) => {
  const dish = getDish(Number(req.params.id));
  if (!dish) return res.status(404).json({ error: '菜品不存在' });
  res.json(dish);
}));

app.post('/api/dishes', asyncRoute((req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '菜品名称不能为空' });
  }
  res.status(201).json(createDish(req.body));
}));

app.put('/api/dishes/:id', asyncRoute((req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '菜品名称不能为空' });
  }
  const updated = updateDish(Number(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: '菜品不存在' });
  res.json(updated);
}));

app.delete('/api/dishes/:id', asyncRoute((req, res) => {
  const ok = deleteDish(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: '菜品不存在' });
  res.status(204).end();
}));

// ---------- 智能推荐 ----------
app.get('/api/recommend', asyncRoute((req, res) => {
  const { meal, mood, maxPrice, maxCook, ingredients, avoidDays, count } = req.query;
  const result = recommend({
    meal: meal || mealTypeByHour(),
    mood: mood || 'any',
    maxPrice: maxPrice ? Number(maxPrice) : null,
    maxCook: maxCook ? Number(maxCook) : null,
    ingredients: ingredients
      ? String(ingredients)
          .split(/[,，\s]+/)
          .filter(Boolean)
      : [],
    avoidDays: avoidDays === undefined ? 2 : Number(avoidDays),
    count: count ? Number(count) : 3
  });
  res.json(result);
}));

// ---------- 用餐记录 ----------
app.get('/api/meals', asyncRoute((req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  res.json(listMeals({ limit }));
}));

app.post('/api/meals', asyncRoute((req, res) => {
  const { dish_id, meal_type, rating } = req.body || {};
  if (!dish_id) return res.status(400).json({ error: '缺少 dish_id' });
  const meal = recordMeal({ dish_id: Number(dish_id), meal_type, rating });
  if (!meal) return res.status(404).json({ error: '菜品不存在' });
  res.status(201).json(meal);
}));

app.patch('/api/meals/:id', asyncRoute((req, res) => {
  const { rating } = req.body || {};
  const updated = updateMealRating(Number(req.params.id), rating);
  if (!updated) return res.status(404).json({ error: '记录不存在' });
  res.json(updated);
}));

app.delete('/api/meals/:id', asyncRoute((req, res) => {
  const ok = deleteMeal(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: '记录不存在' });
  res.status(204).end();
}));

// ---------- 统计 ----------
app.get('/api/stats', asyncRoute((req, res) => {
  res.json(monthlyStats(req.query.month));
}));

// ---------- 兜底 ----------
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

function lanAddresses() {
  const nets = networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    for (const net of (list || [])) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🍚 今天吃什么 已启动`);
  console.log(`  本机:   http://localhost:${PORT}`);
  for (const ip of lanAddresses()) {
    console.log(`  手机:   http://${ip}:${PORT}   (同一 WiFi 下打开)`);
  }
  console.log('');
});
