import { Storage } from '@plasmohq/storage';

const storage = new Storage({ area: 'local' });

export const trustDomainMessageHandler = async (request, sender, sendResponse) => {
  // 获取信任域名列表
  if (request.action === 'MUTLIPOST_EXTENSION_GET_TRUSTED_DOMAINS') {
    const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>('trustedDomains')) || [];
    return sendResponse({ trustedDomains });
  }

  // 删除特定信任域名
  if (request.action === 'MUTLIPOST_EXTENSION_DELETE_TRUSTED_DOMAIN') {
    const { domainId } = request.data;

    console.log('request', request);
    console.log('domainId', domainId);

    if (!domainId) {
      return sendResponse({ success: false, message: '缺少域名ID' });
    }

    const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>('trustedDomains')) || [];
    const updatedDomains = trustedDomains.filter((item) => item.id !== domainId);

    await storage.set('trustedDomains', updatedDomains);
    return sendResponse({ success: true, trustedDomains: updatedDomains });
  }

  if (request.action === 'MUTLIPOST_EXTENSION_REQUEST_TRUST_DOMAIN') {
    // 检查域名是否已经被信任
    const trustedDomains = (await storage.get<Array<{ domain: string }>>('trustedDomains')) || [];
    const hostname = new URL(sender.origin).hostname;
    const isTrusted = trustedDomains.some(({ domain }) => {
      if (domain.startsWith('*.')) {
        const wildCardDomain = domain.slice(2);
        return hostname.endsWith(wildCardDomain);
      }
      return hostname === domain;
    });

    // 如果域名已经被信任，直接返回
    if (isTrusted) {
      return sendResponse({ trusted: true });
    }

    const params = {
      action: 'MUTLIPOST_EXTENSION_REQUEST_TRUST_DOMAIN',
      origin: hostname,
    };

    const encodedParams = btoa(JSON.stringify(params));

    // 打开信任域名确认窗口
    chrome.windows.create({
      url: chrome.runtime.getURL(`tabs/trust-domain.html#${encodedParams}`),
      type: 'popup',
      width: 800,
      height: 600,
    });

    const trustDomainListener = (message, authSender, authSendResponse) => {
      if (message.type === 'MUTLIPOST_EXTENSION_TRUST_DOMAIN_CONFIRM') {
        const { trusted, status } = message;
        sendResponse({ trusted, status });
        authSendResponse('success');
        chrome.runtime.onMessage.removeListener(trustDomainListener);
      }
    };
    chrome.runtime.onMessage.addListener(trustDomainListener);
  }
};
