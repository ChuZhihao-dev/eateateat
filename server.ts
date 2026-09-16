import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ApiError, sendError } from './src/api/errors.js';
import { apiController, isZodError } from './src/controllers/api.controller.js';
import { apiRouter } from './src/routes/api.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});
// 允许打包后的 App（来源为 capacitor://localhost 或 https://localhost）跨域访问
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-request-id');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.static(join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', requestId: res.locals.requestId });
});
// /ready 不属于 API 版本空间，但复用同一控制器，以便部署平台探测。
app.get('/ready', apiController.ready);

app.use('/api', apiRouter);
app.use('/api', (_req, res) => sendError(res, 404, 'NOT_FOUND', '接口不存在'));

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (isZodError(error)) {
    const message = error.issues[0]?.message || '请求参数不合法';
    return sendError(res, 400, 'VALIDATION_ERROR', message);
  }
  if (error instanceof ApiError) {
    return sendError(res, error.status, error.code, error.message);
  }

  const isBadJson = error instanceof SyntaxError && 'body' in error;
  const status = isBadJson ? 400 : 500;
  const code = isBadJson ? 'INVALID_JSON' : 'INTERNAL_ERROR';
  const message = isBadJson ? '请求体不是合法 JSON' : '服务器内部错误';
  console.error(JSON.stringify({ level: 'error', requestId: res.locals.requestId, code, error }));
  return sendError(res, status, code, message);
});

function lanAddresses() {
  const addresses: string[] = [];
  for (const network of Object.values(networkInterfaces())) {
    for (const item of network || []) {
      if (item.family === 'IPv4' && !item.internal) addresses.push(item.address);
    }
  }
  return addresses;
}

export { app };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n  🍚 今天吃什么 已启动');
    console.log(`  本机:   http://localhost:${PORT}`);
    for (const address of lanAddresses())
      console.log(`  手机:   http://${address}:${PORT}   (同一 WiFi 下打开)`);
    console.log('');
  });
}
