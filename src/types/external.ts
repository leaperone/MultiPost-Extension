export type ExtensionExternalRequest<T> = {
  type: "request";
  traceId: string;
  action: string;
  data: T;
};

export interface ExtensionExternalResponse<T> {
  type: "response";
  traceId: string;
  action: string;
  code: number;
  message: string;
  data: T;
}

export function successResponse<T>(request: ExtensionExternalRequest<T>, data: T) {
  return {
    type: "response",
    traceId: request.traceId,
    action: request.action,
    code: 0,
    message: "success",
    data,
  };
}
