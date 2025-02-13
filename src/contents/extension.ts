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

// 初始化默认可信域名
async function initDefaultTrustedDomains() {
  const trustedDomains = await storage.get<Array<{ id: string; domain: string }>>('trustedDomains');
  if (!trustedDomains) {
    await storage.set('trustedDomains', [
      {
        id: crypto.randomUUID(),
        domain: '*.multipost.app',
      },
    ]);
  }
}

async function isOriginTrusted(origin: string): Promise<boolean> {
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
  const isTrusted = await isOriginTrusted(new URL(event.origin).hostname);
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

// 在扩展加载时初始化默认可信域名
initDefaultTrustedDomains();

function defaultHandler<T>(request: ExtensionExternalRequest<T>, event: MessageEvent) {
  chrome.runtime.sendMessage(request).then((response) => {
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
