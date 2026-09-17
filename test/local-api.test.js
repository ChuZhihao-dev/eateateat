import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { SEED_DISHES } from '../src/seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'public', 'local-api.js'), 'utf8');

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
}

function createAPI() {
  const win = { localStorage: memoryStorage(), SEED_DISHES };
  const factory = new Function('window', `${source}\nreturn window.LocalAPI;`);
  return factory(win);
}

describe('本机数据层 LocalAPI', () => {
  let api;
  beforeEach(() => {
    api = createAPI();
  });

  it('meta 返回心情、餐段与建议餐段', async () => {
    const meta = await api.handle('/api/meta');

    expect(meta.moods.length).toBeGreaterThan(0);
    expect(meta.meals).toHaveLength(4);
    expect(['breakfast', 'lunch', 'dinner']).toContain(meta.suggestedMeal);
  });

  it('首次使用自动灌入种子菜品', async () => {
    const dishes = await api.handle('/api/dishes');

    expect(dishes).toHaveLength(SEED_DISHES.length);
    expect(dishes[0]).toHaveProperty('id');
    expect(Array.isArray(dishes[0].tags)).toBe(true);
  });

  it('支持菜品新增、修改与删除', async () => {
    const created = await api.handle('/api/dishes', {
      method: 'POST',
      body: { name: '测试菜', price: 12 }
    });
    expect(created.id).toBeGreaterThan(0);
    expect(created.meals).toEqual(['breakfast', 'lunch', 'dinner']);

    const updated = await api.handle(`/api/dishes/${created.id}`, {
      method: 'PUT',
      body: { name: '测试菜改', tags: ['辣'], spice: 2 }
    });
    expect(updated.name).toBe('测试菜改');
    expect(updated.tags).toEqual(['辣']);

    await api.handle(`/api/dishes/${created.id}`, { method: 'DELETE' });
    const after = await api.handle('/api/dishes');
    expect(after.find((d) => d.id === created.id)).toBeUndefined();
  });

  it('记录用餐、评分、删除并统计', async () => {
    expect(await api.handle('/api/meals')).toHaveLength(0);

    const meal = await api.handle('/api/meals', {
      method: 'POST',
      body: { dish_id: 1, meal_type: 'lunch' }
    });
    expect(meal.dish_name).toBeTruthy();
    expect(meal.rating).toBeNull();

    const rated = await api.handle(`/api/meals/${meal.id}`, {
      method: 'PATCH',
      body: { rating: 5 }
    });
    expect(rated.rating).toBe(5);

    const stats = await api.handle(`/api/stats?month=${meal.eaten_at.slice(0, 7)}`);
    expect(stats.summary.total_meals).toBe(1);
    expect(stats.byMealType[0]).toMatchObject({ meal_type: 'lunch', count: 1 });

    await api.handle(`/api/meals/${meal.id}`, { method: 'DELETE' });
    expect(await api.handle('/api/meals')).toHaveLength(0);
  });

  it('删除菜品会连带删除其用餐记录', async () => {
    const meal = await api.handle('/api/meals', { method: 'POST', body: { dish_id: 2 } });
    expect(meal).toBeTruthy();

    await api.handle('/api/dishes/2', { method: 'DELETE' });
    expect(await api.handle('/api/meals')).toHaveLength(0);
  });

  it('推荐返回指定条数并附带推荐理由', async () => {
    const data = await api.handle('/api/recommend?meal=lunch&mood=spicy&count=3');

    expect(data.context.meal).toBe('lunch');
    expect(data.results).toHaveLength(3);
    for (const item of data.results) {
      expect(item.dish).toHaveProperty('name');
      expect(item.matchScore).toBeGreaterThan(0);
      expect(Array.isArray(item.reasons)).toBe(true);
    }
  });

  it('未知接口抛出错误', async () => {
    await expect(api.handle('/api/not-found')).rejects.toThrow('接口不存在');
  });
});
