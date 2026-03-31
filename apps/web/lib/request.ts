import { NextResponse } from 'next/server';
import { z } from 'zod';

export type RespT<T = unknown> = {
  code: number; // 0 成功，-1 失败
  msg: string; // success 成功，失败具体
  data: T;
};

export function resp(
  code: number = 0,
  msg: string = 'success',
  data: unknown,
  status: number = 200,
): NextResponse<RespT> {
  return NextResponse.json(
    {
      code,
      msg,
      data,
    },
    { status },
  );
}

export function successResp(data: unknown): NextResponse<RespT> {
  return resp(0, 'success', data, 200);
}

export function unauthResp() {
  return resp(-1, 'Unauthenticated', {}, 401);
}

export function errorResp(error: unknown): NextResponse<RespT> {
  if (error instanceof z.ZodError) {
    return resp(-1, 'Invalid request data', error.issues, 400);
  }
  return resp(-1, (error as Error).message, {}, 500);
}
