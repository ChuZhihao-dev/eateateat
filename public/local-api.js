// 本机数据层：不依赖服务端，数据保存在浏览器的 localStorage 中。
// 对外暴露 window.LocalAPI.handle(path, options)，签名与用法和原来的 fetch 接口一致，
// 因此当未配置服务器地址时，app.js 的 api() 会直接调用这里。
(function () {
  const STORAGE_KEY = 'eateateat.db.v1';
  const ALL_MEALS = ['breakfast', 'lunch', 'dinner'];

  const MOODS = {
    any: { key: 'any', label: '随便吃点', tags: [], minSpice: null, maxSpice: null },
    light: { key: 'light', label: '想清淡', tags: ['清淡'], minSpice: null, maxSpice: 1 },
    spicy: { key: 'spicy', label: '想吃辣', tags: ['辣'], minSpice: 2, maxSpice: null },
    heavy: { key: 'heavy', label: '重口味', tags: ['重口'], minSpice: 2, maxSpice: null },
    meat: { key: 'meat', label: '想吃肉', tags: ['荤'], minSpice: null, maxSpice: null },
    veg: { key: 'veg', label: '想吃素', tags: ['素'], minSpice: null, maxSpice: null },
    soup: { key: 'soup', label: '想喝汤', tags: ['汤'], minSpice: null, maxSpice: null },
    lite: { key: 'lite', label: '减脂轻食', tags: ['轻食', '清淡'], minSpice: null, maxSpice: 1 }
  };

  const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

  const pad2 = (n) => String(n).padStart(2, '0');
  function localDay(date = new Date()) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }
  function localDateTime(date = new Date()) {
    return `${localDay(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }
  function parseEatenAt(ts) {
    const [date, time = '00:00:00'] = String(ts).split(' ');
    const [y, mo, da] = date.split('-').map(Number);
    const [h, mi, s] = time.split(':').map(Number);
    return new Date(y, mo - 1, da, h || 0, mi || 0, s || 0);
  }

  function mealTypeByHour(date = new Date()) {
    const h = date.getHours();
    if (h >= 5 && h < 10) return 'breakfast';
    if (h >= 10 && h < 15) return 'lunch';
    return 'dinner';
  }

  function normalizeMeals(meals) {
    if (!Array.isArray(meals) || meals.length === 0) return [...ALL_MEALS];
    return meals.filter((m) => ALL_MEALS.includes(m));
  }

  function normalizeDish(input) {
    return {
      name: String(input.name).trim(),
      cuisine: String(input.cuisine || '家常').trim(),
      meals: normalizeMeals(input.meals),
      tags: Array.isArray(input.tags) ? input.tags : [],
      spice: Number(input.spice) || 0,
      cook: Number(input.cook) || 20,
      price: Number(input.price) || 20,
      ingredients: Array.isArray(input.ingredients) ? input.ingredients : []
    };
  }

  function seedDB() {
    const dishes = (window.SEED_DISHES || []).map((dish, index) => ({
      id: index + 1,
      ...normalizeDish(dish)
    }));
    return { dishes, meals: [], nextDishId: dishes.length + 1, nextMealId: 1 };
  }

  function loadDB() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.dishes) && Array.isArray(parsed.meals)) {
          return {
            dishes: parsed.dishes,
            meals: parsed.meals,
            nextDishId: parsed.nextDishId || parsed.dishes.length + 1,
            nextMealId: parsed.nextMealId || parsed.meals.length + 1
          };
        }
      }
    } catch {
      // 存储损坏时回退到种子数据
    }
    const fresh = seedDB();
    persist(fresh);
    return fresh;
  }

  function persist(target) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
    } catch {
      // 存储不可用（隐私模式等）时仅保留在内存中
    }
  }

  let db = null;
  function getDB() {
    if (!db) db = loadDB();
    return db;
  }

  function commit() {
    persist(db);
  }

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const findDish = (target, id) => target.dishes.find((d) => d.id === id) || null;

  // ---------- 菜品 CRUD ----------

  function sortDishes(list) {
    return [...list].sort(
      (a, b) =>
        String(a.cuisine).localeCompare(String(b.cuisine), 'zh') ||
        String(a.name).localeCompare(String(b.name), 'zh')
    );
  }

  function listDishes() {
    return clone(sortDishes(getDB().dishes));
  }

  function getDish(id) {
    const dish = findDish(getDB(), id);
    return dish ? clone(dish) : null;
  }

  function createDish(input) {
    const target = getDB();
    const dish = { id: target.nextDishId, ...normalizeDish(input) };
    target.nextDishId += 1;
    target.dishes.push(dish);
    commit();
    return clone(dish);
  }

  function updateDish(id, input) {
    const target = getDB();
    const dish = findDish(target, id);
    if (!dish) return null;
    Object.assign(dish, normalizeDish(input));
    commit();
    return clone(dish);
  }

  function deleteDish(id) {
    const target = getDB();
    const index = target.dishes.findIndex((d) => d.id === id);
    if (index === -1) return false;
    target.dishes.splice(index, 1);
    target.meals = target.meals.filter((m) => m.dish_id !== id);
    commit();
    return true;
  }

  // ---------- 用餐记录 ----------

  function mealRow(target, meal) {
    const dish = findDish(target, meal.dish_id);
    if (!dish) return null;
    return {
      id: meal.id,
      dish_id: meal.dish_id,
      meal_type: meal.meal_type,
      rating: meal.rating,
      eaten_at: meal.eaten_at,
      dish_name: dish.name,
      cuisine: dish.cuisine,
      price: dish.price,
      tags: [...dish.tags]
    };
  }

  function listMeals({ limit = 100 } = {}) {
    const target = getDB();
    const sorted = [...target.meals].sort((a, b) =>
      a.eaten_at === b.eaten_at ? b.id - a.id : a.eaten_at < b.eaten_at ? 1 : -1
    );
    return sorted
      .slice(0, Math.max(0, Number(limit) || 100))
      .map((meal) => mealRow(target, meal))
      .filter(Boolean);
  }

  function recordMeal({ dish_id, meal_type, rating = null }) {
    const target = getDB();
    if (!findDish(target, dish_id)) return null;
    const meal = {
      id: target.nextMealId,
      dish_id,
      meal_type: meal_type || 'lunch',
      rating: rating === null || rating === undefined ? null : Number(rating),
      eaten_at: localDateTime()
    };
    target.nextMealId += 1;
    target.meals.push(meal);
    commit();
    return mealRow(target, meal);
  }

  function updateMealRating(id, rating) {
    const target = getDB();
    const meal = target.meals.find((m) => m.id === id);
    if (!meal) return null;
    meal.rating = rating === null || rating === undefined || rating === '' ? null : Number(rating);
    commit();
    return mealRow(target, meal);
  }

  function deleteMeal(id) {
    const target = getDB();
    const index = target.meals.findIndex((m) => m.id === id);
    if (index === -1) return false;
    target.meals.splice(index, 1);
    commit();
    return true;
  }

  function recentDishIds(days = 3) {
    const target = getDB();
    const cutoff = Date.now() - Number(days) * 864e5;
    const ids = new Set();
    for (const meal of target.meals) {
      if (parseEatenAt(meal.eaten_at).getTime() >= cutoff) ids.add(meal.dish_id);
    }
    return [...ids];
  }

  // ---------- 统计 ----------

  function monthlyStats(month) {
    const target = getDB();
    const now = new Date();
    const ym = month || `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;

    const rows = [];
    for (const meal of target.meals) {
      if (meal.eaten_at.slice(0, 7) !== ym) continue;
      const dish = findDish(target, meal.dish_id);
      if (dish) rows.push({ meal, dish });
    }

    const total = rows.length;
    const sumPrice = rows.reduce((sum, row) => sum + (Number(row.dish.price) || 0), 0);
    const summary = {
      total_meals: total,
      distinct_dishes: new Set(rows.map((row) => row.meal.dish_id)).size,
      avg_price: total ? Math.round(sumPrice / total) : null,
      est_cost: total ? Math.round(sumPrice) : null
    };

    const mealTypeCounts = new Map();
    for (const { meal } of rows) {
      mealTypeCounts.set(meal.meal_type, (mealTypeCounts.get(meal.meal_type) || 0) + 1);
    }
    const byMealType = ALL_MEALS.filter((type) => mealTypeCounts.has(type)).map((type) => ({
      meal_type: type,
      count: mealTypeCounts.get(type)
    }));

    const dishCounts = new Map();
    for (const { dish } of rows) {
      const entry = dishCounts.get(dish.id) || { name: dish.name, cuisine: dish.cuisine, count: 0 };
      entry.count += 1;
      dishCounts.set(dish.id, entry);
    }
    const topDishes = [...dishCounts.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
      .slice(0, 10);

    const cuisineCounts = new Map();
    for (const { dish } of rows) {
      cuisineCounts.set(dish.cuisine, (cuisineCounts.get(dish.cuisine) || 0) + 1);
    }
    const byCuisine = [...cuisineCounts.entries()]
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count);

    return { month: ym, summary, byMealType, topDishes, byCuisine };
  }

  // ---------- 推荐 ----------

  function ratingByDish(target) {
    const grouped = new Map();
    for (const meal of target.meals) {
      if (meal.rating == null) continue;
      const current = grouped.get(meal.dish_id) || { sum: 0, n: 0 };
      current.sum += meal.rating;
      current.n += 1;
      grouped.set(meal.dish_id, current);
    }
    const avg = new Map();
    for (const [id, { sum, n }] of grouped) avg.set(id, sum / n);
    return avg;
  }

  function scoreDish(dish, ctx) {
    const { mood, maxPrice, maxCook, ingredients, ratings, eatenIds, recentlyEatenIds } = ctx;
    const reasons = [];
    let score = 1;

    if (mood && mood.tags.length) {
      const hits = mood.tags.filter((tag) => dish.tags.includes(tag));
      if (hits.length) {
        score += 5 * hits.length;
        reasons.push(`符合「${mood.label}」`);
      } else if (mood.key !== 'any') {
        score -= 3;
      }
    }
    if (mood && mood.minSpice != null) {
      if (dish.spice >= mood.minSpice) score += 2;
      else score -= 4;
    }
    if (mood && mood.maxSpice != null && dish.spice > mood.maxSpice) score -= 4;

    if (maxPrice && dish.price > maxPrice) {
      score -= 10;
    } else if (maxPrice) {
      score += Math.max(0, (maxPrice - dish.price) / 10);
      reasons.push(`¥${dish.price} 在预算内`);
    }
    if (maxCook && dish.cook > maxCook) {
      score -= 10;
    } else if (maxCook) {
      score += Math.max(0, (maxCook - dish.cook) / 15);
    }

    if (ingredients && ingredients.length) {
      const owned = ingredients.map((s) => s.trim()).filter(Boolean);
      const hits = dish.ingredients.filter((ing) =>
        owned.some((o) => ing.includes(o) || o.includes(ing))
      );
      if (hits.length) {
        score += 3 * hits.length;
        reasons.push(`用得上：${hits.join('、')}`);
      }
      if (hits.length === dish.ingredients.length && dish.ingredients.length > 0) {
        score += 2;
        reasons.push('食材齐全');
      }
    }

    const rating = ratings.get(dish.id);
    if (rating != null) {
      score += (rating - 3) * 1.5;
      if (rating >= 4) reasons.push(`你给过 ${rating.toFixed(1)} 分`);
    }

    if (!eatenIds.has(dish.id)) {
      score += 2;
      reasons.push('还没吃过，尝尝鲜');
    } else if (recentlyEatenIds.has(dish.id)) {
      score -= 6;
    }

    return { score: Math.max(0.1, score), reasons };
  }

  function weightedSample(items, count) {
    const pool = items.map((item) => ({ ...item }));
    const picked = [];
    while (picked.length < count && pool.length) {
      const total = pool.reduce((sum, item) => sum + item.score, 0);
      let r = Math.random() * total;
      let index = 0;
      for (; index < pool.length; index += 1) {
        r -= pool[index].score;
        if (r <= 0) break;
      }
      index = Math.min(index, pool.length - 1);
      picked.push(pool[index]);
      pool.splice(index, 1);
    }
    return picked;
  }

  function matchesMeal(dish, meal) {
    if (!meal || meal === 'any') return true;
    return dish.meals.includes(meal);
  }

  function withinHardLimits(dish, maxPrice, maxCook) {
    if (maxPrice && dish.price > maxPrice) return false;
    if (maxCook && dish.cook > maxCook) return false;
    return true;
  }

  function toNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function recommend(query = {}) {
    const target = getDB();
    const meal = query.meal || mealTypeByHour();
    const moodKey = query.mood || 'any';
    const moodPreset = MOODS[moodKey] || MOODS.any;
    const maxPrice = toNumber(query.maxPrice);
    const maxCook = toNumber(query.maxCook);
    const ingredients = query.ingredients
      ? query.ingredients.split(/[,，\s]+/).filter(Boolean)
      : [];
    const avoidDays = query.avoidDays == null ? 2 : Number(query.avoidDays);
    const count = query.count == null ? 3 : Number(query.count);

    const all = target.dishes;
    const ratings = ratingByDish(target);
    const eatenIds = new Set(target.meals.map((m) => m.dish_id));
    const recentlyEatenIds = new Set(avoidDays > 0 ? recentDishIds(avoidDays) : []);

    const ctx = {
      mood: moodPreset,
      maxPrice,
      maxCook,
      ingredients,
      ratings,
      eatenIds,
      recentlyEatenIds
    };

    const attempts = [
      (d) =>
        matchesMeal(d, meal) &&
        withinHardLimits(d, maxPrice, maxCook) &&
        !recentlyEatenIds.has(d.id),
      (d) => matchesMeal(d, meal) && withinHardLimits(d, maxPrice, maxCook),
      (d) => matchesMeal(d, meal),
      () => true
    ];

    let candidates = [];
    let level = attempts.length - 1;
    for (let i = 0; i < attempts.length; i += 1) {
      candidates = all.filter(attempts[i]);
      if (candidates.length) {
        level = i;
        break;
      }
    }

    const scored = candidates.map((dish) => {
      const { score, reasons } = scoreDish(dish, ctx);
      return { dish, score, reasons };
    });

    const picked = weightedSample(scored, Math.max(1, Math.min(count, 10)));

    return {
      context: {
        meal,
        mealLabel: MEAL_LABELS[meal] || '这一餐',
        mood: moodPreset.key,
        moodLabel: moodPreset.label,
        maxPrice,
        maxCook,
        ingredients,
        avoidDays,
        candidateCount: candidates.length,
        relaxed: level > 0 ? level : false
      },
      results: picked.map(({ dish, score, reasons }) => ({
        dish: clone(dish),
        matchScore: Math.round(score * 10) / 10,
        reasons
      }))
    };
  }

  function meta() {
    return {
      moods: Object.values(MOODS),
      suggestedMeal: mealTypeByHour(),
      meals: [
        { key: 'breakfast', label: '早餐' },
        { key: 'lunch', label: '午餐' },
        { key: 'dinner', label: '晚餐' },
        { key: 'any', label: '不限' }
      ]
    };
  }

  const notFound = (message) => {
    throw new Error(message);
  };

  async function handle(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const [pathname, search = ''] = String(path).split('?');
    const query = Object.fromEntries(new URLSearchParams(search));
    const body = options.body || {};

    if (pathname === '/api/meta') return meta();

    if (pathname === '/api/dishes') {
      if (method === 'GET') return listDishes();
      if (method === 'POST') return createDish(body);
    }

    const dishMatch = pathname.match(/^\/api\/dishes\/(\d+)$/);
    if (dishMatch) {
      const id = Number(dishMatch[1]);
      if (method === 'GET') return getDish(id) || notFound('菜品不存在');
      if (method === 'PUT') return updateDish(id, body) || notFound('菜品不存在');
      if (method === 'DELETE') {
        if (!deleteDish(id)) notFound('菜品不存在');
        return null;
      }
    }

    if (pathname === '/api/recommend') return recommend(query);

    if (pathname === '/api/meals') {
      if (method === 'GET') return listMeals({ limit: toNumber(query.limit) || 100 });
      if (method === 'POST') return recordMeal(body) || notFound('菜品不存在');
    }

    const mealMatch = pathname.match(/^\/api\/meals\/(\d+)$/);
    if (mealMatch) {
      const id = Number(mealMatch[1]);
      if (method === 'PATCH')
        return updateMealRating(id, body.rating ?? null) || notFound('记录不存在');
      if (method === 'DELETE') {
        if (!deleteMeal(id)) notFound('记录不存在');
        return null;
      }
    }

    if (pathname === '/api/stats') return monthlyStats(query.month);

    return notFound('接口不存在');
  }

  function reset() {
    db = seedDB();
    persist(db);
    return db;
  }

  window.LocalAPI = { handle, reset };
})();
