import { listDishes, recentDishIds, listMeals } from './db.js';

// 用餐时段：早 / 午 / 晚，也支持 any
export function mealTypeByHour(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  return 'dinner';
}

// 心情 -> 口味偏好预设（前端下拉直接复用）
export const MOODS = {
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

// 历史评分：菜品平均分，用于给吃过的“好菜”加权
function ratingByDish() {
  const rows = listMeals({ limit: 1000 });
  const map = new Map();
  for (const r of rows) {
    if (r.rating == null) continue;
    const cur = map.get(r.dish_id) || { sum: 0, n: 0 };
    cur.sum += r.rating;
    cur.n += 1;
    map.set(r.dish_id, cur);
  }
  const avg = new Map();
  for (const [id, { sum, n }] of map) avg.set(id, sum / n);
  return avg;
}

function scoreDish(dish, { mood, maxPrice, maxCook, ingredients, ratings, eatenIds, recentlyEatenIds }) {
  const reasons = [];
  let score = 1;

  // 1) 心情 / 口味匹配
  if (mood && mood.tags.length) {
    const hits = mood.tags.filter((t) => dish.tags.includes(t));
    if (hits.length) {
      score += 5 * hits.length;
      reasons.push(`符合「${mood.label}」`);
    } else if (mood.key !== 'any') {
      score -= 3;
    }
  }
  if (mood && mood.minSpice != null) {
    if (dish.spice >= mood.minSpice) {
      score += 2;
    } else {
      score -= 4;
    }
  }
  if (mood && mood.maxSpice != null && dish.spice > mood.maxSpice) {
    score -= 4;
  }

  // 2) 预算 / 耗时
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

  // 3) 冰箱/手头食材匹配
  if (ingredients && ingredients.length) {
    const owned = ingredients.map((s) => s.trim()).filter(Boolean);
    const hits = dish.ingredients.filter((ing) => owned.some((o) => ing.includes(o) || o.includes(ing)));
    if (hits.length) {
      score += 3 * hits.length;
      reasons.push(`用得上：${hits.join('、')}`);
    }
    if (hits.length === dish.ingredients.length && dish.ingredients.length > 0) {
      score += 2;
      reasons.push('食材齐全');
    }
  }

  // 4) 历史评分加成
  const r = ratings.get(dish.id);
  if (r != null) {
    score += (r - 3) * 1.5;
    if (r >= 4) reasons.push(`你给过 ${r.toFixed(1)} 分`);
  }

  // 5) 新鲜度：很久没吃的加分，最近吃过的减分
  if (!eatenIds.has(dish.id)) {
    score += 2;
    reasons.push('还没吃过，尝尝鲜');
  } else if (recentlyEatenIds.has(dish.id)) {
    score -= 6;
  }

  return { score: Math.max(0.1, score), reasons };
}

// 加权随机抽取，不重复
function weightedSample(items, count) {
  const pool = items.map((it) => ({ ...it }));
  const picked = [];
  while (picked.length < count && pool.length) {
    const total = pool.reduce((s, it) => s + it.score, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx += 1) {
      r -= pool[idx].score;
      if (r <= 0) break;
    }
    idx = Math.min(idx, pool.length - 1);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/**
 * 生成推荐结果
 * @param {object} opts
 * @param {string} [opts.meal]        breakfast|lunch|dinner|any
 * @param {string} [opts.mood]        MOODS 的 key
 * @param {number} [opts.maxPrice]    人均预算上限
 * @param {number} [opts.maxCook]     最长做饭时间
 * @param {string[]} [opts.ingredients] 手头食材
 * @param {number} [opts.avoidDays]   多少天内吃过的排除 (0=不排除)
 * @param {number} [opts.count]       返回条数
 */
export function recommend(opts = {}) {
  const {
    meal = mealTypeByHour(),
    mood = 'any',
    maxPrice = null,
    maxCook = null,
    ingredients = [],
    avoidDays = 2,
    count = 3
  } = opts;

  const moodPreset = MOODS[mood] || MOODS.any;
  const all = listDishes();
  const ratings = ratingByDish();
  const eatenIds = new Set(listMeals({ limit: 1000 }).map((m) => m.dish_id));
  const recentlyEatenIds = new Set(avoidDays > 0 ? recentDishIds(avoidDays) : []);

  const ctx = { mood: moodPreset, maxPrice, maxCook, ingredients, ratings, eatenIds, recentlyEatenIds };

  // 逐级放宽条件，保证一定有结果
  const attempts = [
    // 严格：时段 + 硬性条件 + 排除最近
    (d) => matchesMeal(d, meal) && withinHardLimits(d, maxPrice, maxCook) && !recentlyEatenIds.has(d.id),
    // 放宽：允许最近吃过的
    (d) => matchesMeal(d, meal) && withinHardLimits(d, maxPrice, maxCook),
    // 再放宽：忽略预算/耗时
    (d) => matchesMeal(d, meal),
    // 最后：全库
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
      dish,
      matchScore: Math.round(score * 10) / 10,
      reasons
    }))
  };
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
