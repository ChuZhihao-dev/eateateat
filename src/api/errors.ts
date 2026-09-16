import type { Response } from 'express';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function sendError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({
    error: message,
    code,
    message,
    requestId: res.locals.requestId
  });
}
