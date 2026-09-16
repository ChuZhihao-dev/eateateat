import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { SEED_DISHES } from './seed.js';
import { runMigrations } from './migrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'app.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

runMigrations(db);

const ALL_MEALS = ['breakfast', 'lunch', 'dinner'];

export function checkDatabaseHealth() {
  db.prepare('SELECT 1 AS ok').get();
  return true;
}

function parseArr(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToDish(row) {
  return {
    ...row,
    meals: parseArr(row.meals),
    tags: parseArr(row.tags),
    ingredients: parseArr(row.ingredients)
  };
}

function normalizeMeals(meals) {
  if (!Array.isArray(meals) || meals.length === 0) return [...ALL_MEALS];
  return meals.filter((m) => ALL_MEALS.includes(m));
}

// ---------- 菜品 CRUD ----------

export function listDishes() {
  return db.prepare('SELECT * FROM dishes ORDER BY cuisine, name').all().map(rowToDish);
}

export function getDish(id) {
  const row = db.prepare('SELECT * FROM dishes WHERE id = ?').get(id);
  return row ? rowToDish(row) : null;
}

export function createDish(input) {
  const info = db
    .prepare(
      `INSERT INTO dishes (name, cuisine, meals, tags, spice, cook, price, ingredients)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(input.name).trim(),
      String(input.cuisine || '家常').trim(),
      JSON.stringify(normalizeMeals(input.meals)),
      JSON.stringify(Array.isArray(input.tags) ? input.tags : []),
      Number(input.spice) || 0,
      Number(input.cook) || 20,
      Number(input.price) || 20,
      JSON.stringify(Array.isArray(input.ingredients) ? input.ingredients : [])
    );
  return getDish(Number(info.lastInsertRowid));
}

export function updateDish(id, input) {
  if (!getDish(id)) return null;
  db.prepare(
    `UPDATE dishes
       SET name = ?, cuisine = ?, meals = ?, tags = ?, spice = ?, cook = ?, price = ?, ingredients = ?
     WHERE id = ?`
  ).run(
    String(input.name).trim(),
    String(input.cuisine || '家常').trim(),
    JSON.stringify(normalizeMeals(input.meals)),
    JSON.stringify(Array.isArray(input.tags) ? input.tags : []),
    Number(input.spice) || 0,
    Number(input.cook) || 20,
    Number(input.price) || 20,
    JSON.stringify(Array.isArray(input.ingredients) ? input.ingredients : []),
    id
  );
  return getDish(id);
}

export function deleteDish(id) {
  const info = db.prepare('DELETE FROM dishes WHERE id = ?').run(id);
  return info.changes > 0;
}

// ---------- 用餐记录 ----------

export function recordMeal({ dish_id, meal_type, rating = null }) {
  const dish = getDish(dish_id);
  if (!dish) return null;
  const info = db
    .prepare('INSERT INTO meals (dish_id, meal_type, rating) VALUES (?, ?, ?)')
    .run(dish_id, meal_type || 'lunch', rating === null ? null : Number(rating));
  return getMeal(Number(info.lastInsertRowid));
}

export function getMeal(id) {
  const row = db
    .prepare(
      `SELECT m.*, d.name AS dish_name, d.cuisine, d.price
         FROM meals m JOIN dishes d ON d.id = m.dish_id
        WHERE m.id = ?`
    )
    .get(id);
  return row || null;
}

export function listMeals({ limit = 100 } = {}) {
  return db
    .prepare(
      `SELECT m.id, m.dish_id, m.meal_type, m.rating, m.eaten_at,
              d.name AS dish_name, d.cuisine, d.price, d.tags
         FROM meals m JOIN dishes d ON d.id = m.dish_id
        ORDER BY m.eaten_at DESC, m.id DESC
        LIMIT ?`
    )
    .all(limit)
    .map((r) => ({ ...r, tags: parseArr(r.tags) }));
}

export function updateMealRating(id, rating) {
  const value = rating === null || rating === undefined || rating === '' ? null : Number(rating);
  const info = db.prepare('UPDATE meals SET rating = ? WHERE id = ?').run(value, id);
  if (info.changes === 0) return null;
  return getMeal(id);
}

export function deleteMeal(id) {
  const info = db.prepare('DELETE FROM meals WHERE id = ?').run(id);
  return info.changes > 0;
}

// 最近 days 天内吃过的 dish_id，用于“避免重复”
export function recentDishIds(days = 3) {
  return db
    .prepare(
      `SELECT DISTINCT dish_id FROM meals
        WHERE eaten_at >= datetime('now','localtime','-' || ? || ' days')`
    )
    .all(days)
    .map((r) => r.dish_id);
}

// ---------- 统计 ----------

export function monthlyStats(month) {
  const now = new Date();
  const localMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ym = month || localMonth; // YYYY-MM，和 SQLite 的 localtime 记录保持一致
  const summary = db
    .prepare(
      `SELECT COUNT(*) AS total_meals,
              COUNT(DISTINCT dish_id) AS distinct_dishes,
              CAST(ROUND(AVG(price)) AS INTEGER) AS avg_price,
              CAST(ROUND(SUM(price)) AS INTEGER) AS est_cost
         FROM meals m JOIN dishes d ON d.id = m.dish_id
        WHERE strftime('%Y-%m', m.eaten_at) = ?`
    )
    .get(ym);

  const byMealType = db
    .prepare(
      `SELECT meal_type, COUNT(*) AS count
         FROM meals
        WHERE strftime('%Y-%m', eaten_at) = ?
        GROUP BY meal_type`
    )
    .all(ym);

  const topDishes = db
    .prepare(
      `SELECT d.name, d.cuisine, COUNT(*) AS count
         FROM meals m JOIN dishes d ON d.id = m.dish_id
        WHERE strftime('%Y-%m', m.eaten_at) = ?
        GROUP BY m.dish_id
        ORDER BY count DESC, d.name
        LIMIT 10`
    )
    .all(ym);

  const byCuisine = db
    .prepare(
      `SELECT d.cuisine, COUNT(*) AS count
         FROM meals m JOIN dishes d ON d.id = m.dish_id
        WHERE strftime('%Y-%m', m.eaten_at) = ?
        GROUP BY d.cuisine
        ORDER BY count DESC`
    )
    .all(ym);

  return { month: ym, summary, byMealType, topDishes, byCuisine };
}

// ---------- 首次启动填充种子数据 ----------

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM dishes').get();
  if (count > 0) return;
  const insert = db.prepare(
    `INSERT INTO dishes (name, cuisine, meals, tags, spice, cook, price, ingredients)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.prepare('BEGIN');
  tx.run();
  try {
    for (const d of SEED_DISHES) {
      insert.run(
        d.name,
        d.cuisine,
        JSON.stringify(d.meals),
        JSON.stringify(d.tags),
        d.spice,
        d.cook,
        d.price,
        JSON.stringify(d.ingredients)
      );
    }
    db.prepare('COMMIT').run();
  } catch (err) {
    db.prepare('ROLLBACK').run();
    throw err;
  }
}

seedIfEmpty();

export default db;
