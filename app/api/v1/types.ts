export interface ResponseData<T> {
  success: boolean;
  error?: string;
  data?: T;
  meta?: {
    credits: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export function successResponse<T>(data: T, meta?: { credits: number }): ResponseData<T> {
  return {
    success: true,
    data,
    meta,
  };
}