/* Modified for the MultiPost Professional build; original extension code remains Apache-2.0 licensed. */
import type { PlasmoCSConfig } from "plasmo";
import type { ExtensionExternalRequest, ExtensionExternalResponse } from "~types/external";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
};

const ACTIONS_NOT_NEED_TRUST_DOMAIN = ["MULTIPOST_EXTENSION_REQUEST_TRUST_DOMAIN"];
const AUTHORIZE_EXTERNAL_REQUEST = "MULTIPOST_EXTENSION_AUTHORIZE_EXTERNAL_REQUEST";

function isExternalRequest(value: unknown): value is ExtensionExternalRequest<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Partial<ExtensionExternalRequest<unknown>>;
  return request.type === "request" && typeof request.traceId === "string" && typeof request.action === "string";
}

function getRightAction(action: string) {
  if (action.startsWith("MUTLIPOST")) {
    return action.replace(/^MUTLIPOST/, "MULTIPOST");
  }
  return action;
}

function postResponse(event: MessageEvent, response: ExtensionExternalResponse<unknown>): void {
  if (event.source !== window) return;
  const targetOrigin = event.origin === "null" ? "*" : event.origin;
  window.postMessage(response, targetOrigin);
}

async function authorizeRequest(request: ExtensionExternalRequest<unknown>, event: MessageEvent): Promise<boolean> {
  if (ACTIONS_NOT_NEED_TRUST_DOMAIN.includes(getRightAction(request.action))) return true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: AUTHORIZE_EXTERNAL_REQUEST,
      data: { action: getRightAction(request.action) },
    });
    return response?.authorized === true;
  } catch {
    return false;
  }
}

window.addEventListener("message", async (event) => {
  if (event.source !== window || !isExternalRequest(event.data)) return;
  const request = event.data;
  const action = getRightAction(request.action);

  if (!action.startsWith("MULTIPOST")) return;

  // The service worker derives the caller origin from the content-script sender.
  // The page cannot choose or read the trusted-domain list in this context.
  if (!(await authorizeRequest(request, event))) {
    postResponse(event, {
      type: "response",
      traceId: request.traceId,
      action: request.action,
      code: 403,
      message: "Untrusted origin",
      data: null,
    });
    return;
  }

  defaultHandler(request, event);
});

function defaultHandler<T>(request: ExtensionExternalRequest<T>, event: MessageEvent) {
  const newRequest = {
    ...request,
    action: getRightAction(request.action),
  };

  chrome.runtime
    .sendMessage(newRequest)
    .then((response) => {
      postResponse(event, successResponse(request, response));
    })
    .catch((err) => {
      postResponse(event, {
        type: "response",
        traceId: request.traceId,
        action: request.action,
        code: 500,
        message: String(err?.message ?? err),
        data: null,
      });
    });
}

function successResponse<T>(request: ExtensionExternalRequest<T>, data: T) {
  return {
    type: "response",
    traceId: request.traceId,
    action: request.action,
    code: 0,
    message: "success",
    data,
  } as ExtensionExternalResponse<T>;
}
