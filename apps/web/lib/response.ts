import { NextResponse } from 'next/server';
import { z } from 'zod';

export function successResponse(data: unknown, meta?: { credits: number }) {
  return NextResponse.json({
    success: true,
    data,
    meta,
  });
}

export function unauthenticatedResponse() {
  return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
}

export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: 'Invalid request data', details: error.issues }, { status: 400 });
  }
  return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
}
