/* Modified for the MultiPost Professional build; original extension code remains Apache-2.0 licensed. */
import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });

const AUTHORIZE_EXTERNAL_REQUEST = "MULTIPOST_EXTENSION_AUTHORIZE_EXTERNAL_REQUEST";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSenderOrigin(sender: chrome.runtime.MessageSender): string | null {
  const candidate = sender.url || sender.origin;
  if (!candidate) return null;
  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function isExtensionPage(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id && Boolean(sender.url?.startsWith(chrome.runtime.getURL("")));
}

function domainMatches(origin: string, domain: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    if (domain.startsWith("*.")) {
      const wildcardDomain = domain.slice(2);
      return hostname === wildcardDomain || hostname.endsWith(`.${wildcardDomain}`);
    }
    return hostname === domain;
  } catch {
    return false;
  }
}

async function isTrustedOrigin(origin: string): Promise<boolean> {
  const trustedDomains = (await storage.get<Array<{ domain: string }>>("trustedDomains")) || [];
  return trustedDomains.some(({ domain }) => typeof domain === "string" && domainMatches(origin, domain));
}

async function manageTrustedDomains(request: Record<string, unknown>, sendResponse): Promise<void> {
  if (request.action === "MULTIPOST_EXTENSION_GET_TRUSTED_DOMAINS") {
    try {
      const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>("trustedDomains")) || [];
      sendResponse({ trustedDomains });
    } catch (error) {
      sendResponse({ trustedDomains: [], error: String(error instanceof Error ? error.message : error) });
    }
    return;
  }

  if (request.action === "MULTIPOST_EXTENSION_DELETE_TRUSTED_DOMAIN") {
    const domainId = isRecord(request.data) && typeof request.data.domainId === "string" ? request.data.domainId : "";
    if (!domainId) {
      sendResponse({ success: false, message: "缺少域名ID" });
      return;
    }
    try {
      const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>("trustedDomains")) || [];
      const updatedDomains = trustedDomains.filter((item) => item.id !== domainId);
      await storage.set("trustedDomains", updatedDomains);
      sendResponse({ success: true, trustedDomains: updatedDomains });
    } catch (error) {
      sendResponse({ success: false, message: String(error instanceof Error ? error.message : error) });
    }
  }
}

function denyDomainManagement(sendResponse): void {
  sendResponse({ trustedDomains: [], success: false, message: "仅扩展设置页或已信任网站可以管理信任域名" });
}

export const trustDomainMessageHandler = (request: unknown, sender: chrome.runtime.MessageSender, sendResponse) => {
  if (!isRecord(request)) return false;

  // Content scripts must ask the service worker for authorization. The origin
  // is derived from sender.url/sender.origin; request.data cannot override it.
  if (request.action === AUTHORIZE_EXTERNAL_REQUEST) {
    const action = isRecord(request.data) && typeof request.data.action === "string" ? request.data.action : "";
    const origin = getSenderOrigin(sender);
    if (!action || !origin || action === AUTHORIZE_EXTERNAL_REQUEST) {
      sendResponse({ authorized: false });
      return true;
    }
    isTrustedOrigin(origin)
      .then((authorized) => sendResponse({ authorized }))
      .catch(() => sendResponse({ authorized: false }));
    return true;
  }

  if (request.action === "MULTIPOST_EXTENSION_CHECK_TRUST_DOMAIN") {
    const origin = getSenderOrigin(sender);
    if (!origin) {
      sendResponse({ trusted: false });
      return true;
    }
    isTrustedOrigin(origin)
      .then((trusted) => sendResponse({ trusted }))
      .catch(() => sendResponse({ trusted: false }));
    return true;
  }

  if (
    request.action === "MULTIPOST_EXTENSION_GET_TRUSTED_DOMAINS" ||
    request.action === "MULTIPOST_EXTENSION_DELETE_TRUSTED_DOMAIN"
  ) {
    if (isExtensionPage(sender)) {
      void manageTrustedDomains(request, sendResponse);
      return true;
    }
    const origin = getSenderOrigin(sender);
    if (!origin) {
      denyDomainManagement(sendResponse);
      return true;
    }
    void isTrustedOrigin(origin)
      .then((allowed) => (allowed ? manageTrustedDomains(request, sendResponse) : denyDomainManagement(sendResponse)))
      .catch(() => denyDomainManagement(sendResponse));
    return true;
  }

  if (request.action === "MULTIPOST_EXTENSION_REQUEST_TRUST_DOMAIN") {
    (async () => {
      try {
        // 检查域名是否已经被信任
        const origin = getSenderOrigin(sender);
        if (!origin) throw new Error("无法确定请求来源");
        const isTrusted = await isTrustedOrigin(origin);

        // 如果域名已经被信任，直接返回
        if (isTrusted) {
          sendResponse({ trusted: true });
          return;
        }

        const params = {
          action: "MULTIPOST_EXTENSION_REQUEST_TRUST_DOMAIN",
          origin: new URL(origin).hostname,
        };

        const encodedParams = btoa(JSON.stringify(params));

        const trustDomainListener = (message, authSender, authSendResponse) => {
          if (isRecord(message) && message.type === "MULTIPOST_EXTENSION_TRUST_DOMAIN_CONFIRM" && isExtensionPage(authSender)) {
            const { trusted, status } = message;
            sendResponse({ trusted, status });
            authSendResponse("success");
            chrome.runtime.onMessage.removeListener(trustDomainListener);
          }
        };
        chrome.runtime.onMessage.addListener(trustDomainListener);

        // 打开信任域名确认窗口
        chrome.windows
          .create({
            url: chrome.runtime.getURL(`tabs/trust-domain.html#${encodedParams}`),
            type: "popup",
            width: 800,
            height: 600,
          })
          .catch((error) => {
            chrome.runtime.onMessage.removeListener(trustDomainListener);
            sendResponse({
              trusted: false,
              status: "error",
              message: String(error instanceof Error ? error.message : error),
            });
          });
      } catch (error) {
        sendResponse({
          trusted: false,
          status: "error",
          message: String(error instanceof Error ? error.message : error),
        });
      }
    })();
    return true;
  }
  return false;
};
