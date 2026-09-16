import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../server.ts';

describe('运行状态与 API 错误契约', () => {
  it('报告进程健康状态并返回请求 ID', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('报告数据库就绪状态', async () => {
    const response = await request(app).get('/ready').expect(200);

    expect(response.body).toMatchObject({ status: 'ready' });
  });

  it('为未知 API 返回稳定错误结构', async () => {
    const response = await request(app).get('/api/not-found').expect(404);

    expect(response.body).toMatchObject({
      error: '接口不存在',
      code: 'NOT_FOUND'
    });
    expect(response.body.requestId).toBeTruthy();
  });

  it('拒绝非法路径参数', async () => {
    const response = await request(app).get('/api/dishes/not-a-number').expect(400);

    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('拒绝超出范围的评分和推荐数量', async () => {
    const invalidRating = await request(app)
      .post('/api/meals')
      .send({ dish_id: 1, rating: 6 })
      .expect(400);
    const invalidCount = await request(app).get('/api/recommend?count=11').expect(400);

    expect(invalidRating.body.code).toBe('VALIDATION_ERROR');
    expect(invalidCount.body.code).toBe('VALIDATION_ERROR');
  });
});
