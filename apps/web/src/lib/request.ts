import { z } from 'zod';

export type RespT<T = unknown> = {
  code: number; // 0 success, -1 failure
  msg: string; // success or failure detail
  data: T;
};

export function resp(
  code: number = 0,
  msg: string = 'success',
  data: unknown,
  status: number = 200,
): Response {
  return Response.json(
    {
      code,
      msg,
      data,
    },
    { status },
  );
}

export function successResp(data: unknown): Response {
  return resp(0, 'success', data, 200);
}

export function unauthResp() {
  return resp(-1, 'Unauthenticated', {}, 401);
}

export function errorResp(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return resp(-1, 'Invalid request data', error.issues, 400);
  }
  return resp(-1, (error as Error).message, {}, 500);
}
