import { z } from 'zod';

export function successResponse(data: unknown, meta?: { credits: number }) {
  return Response.json({
    success: true,
    data,
    meta,
  });
}

export function unauthenticatedResponse() {
  return Response.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
}

export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return Response.json(
      { success: false, error: 'Invalid request data', details: error.issues },
      { status: 400 },
    );
  }
  return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
}
