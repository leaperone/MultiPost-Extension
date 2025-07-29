export {};
import type { PlasmoCSConfig } from 'plasmo';
import type { ExtensionExternalRequest, ExtensionExternalResponse } from '~types/external';
import { Storage } from '@plasmohq/storage';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_start',
};

const storage = new Storage({
  area: 'local',
});

const ACTIONS_NOT_NEED_TRUST_DOMAIN = ['MULTIPOST_EXTENSION_REQUEST_TRUST_DOMAIN'];

function getRightAction(action: string) {
  if (action.startsWith('MUTLIPOST')) {
    return action.replace(/^MUTLIPOST/, 'MULTIPOST');
  }
  return action;
}

async function isOriginTrusted(origin: string, action: string): Promise<boolean> {
  if (ACTIONS_NOT_NEED_TRUST_DOMAIN.includes(action)) {
    return true;
  }

  const trustedDomains = (await storage.get<Array<{ domain: string }>>('trustedDomains')) || [];

  return trustedDomains.some(({ domain }) => {
    if (domain.startsWith('*.')) {
      const wildCardDomain = domain.slice(2);
      return origin.endsWith(wildCardDomain);
    }
    return origin === domain;
  });
}

window.addEventListener('message', async (event) => {
  const request: ExtensionExternalRequest<unknown> = event.data;

  if (request.type !== 'request') {
    return;
  }
  
  // 验证来源是否可信
  const isTrusted = await isOriginTrusted(new URL(event.origin).hostname, getRightAction(request.action));
  if (!isTrusted) {
    event.source.postMessage({
      type: 'response',
      traceId: request.traceId,
      action: request.action,
      code: 403,
      message: 'Untrusted origin',
      data: null,
    } as ExtensionExternalResponse<null>);
    return;
  }

  defaultHandler(request, event);
});

function defaultHandler<T>(request: ExtensionExternalRequest<T>, event: MessageEvent) {
  const newRequest = {
    ...request,
    action: getRightAction(request.action),
  };

  chrome.runtime.sendMessage(newRequest).then((response) => {
    event.source.postMessage(successResponse(request, response));
  });
}

function successResponse<T>(request: ExtensionExternalRequest<T>, data: T) {
  return {
    type: 'response',
    traceId: request.traceId,
    action: request.action,
    code: 0,
    message: 'success',
    data,
  } as ExtensionExternalResponse<T>;
}
