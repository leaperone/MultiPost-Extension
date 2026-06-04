import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });

export const trustDomainMessageHandler = (request, sender, sendResponse) => {
  // 获取信任域名列表
  if (request.action === "MULTIPOST_EXTENSION_GET_TRUSTED_DOMAINS") {
    (async () => {
      try {
        const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>("trustedDomains")) || [];
        sendResponse({ trustedDomains });
      } catch (error) {
        sendResponse({ trustedDomains: [], error: String(error instanceof Error ? error.message : error) });
      }
    })();
    return true;
  }

  // 删除特定信任域名
  if (request.action === "MULTIPOST_EXTENSION_DELETE_TRUSTED_DOMAIN") {
    const { domainId } = request.data;

    console.log("request", request);
    console.log("domainId", domainId);

    if (!domainId) {
      sendResponse({ success: false, message: "缺少域名ID" });
      return true;
    }

    (async () => {
      try {
        const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>("trustedDomains")) || [];
        const updatedDomains = trustedDomains.filter((item) => item.id !== domainId);

        await storage.set("trustedDomains", updatedDomains);
        sendResponse({ success: true, trustedDomains: updatedDomains });
      } catch (error) {
        sendResponse({ success: false, message: String(error instanceof Error ? error.message : error) });
      }
    })();
    return true;
  }

  if (request.action === "MULTIPOST_EXTENSION_REQUEST_TRUST_DOMAIN") {
    (async () => {
      try {
        // 检查域名是否已经被信任
        const trustedDomains = (await storage.get<Array<{ domain: string }>>("trustedDomains")) || [];
        const hostname = new URL(sender.origin).hostname;
        const isTrusted = trustedDomains.some(({ domain }) => {
          if (domain.startsWith("*.")) {
            const wildCardDomain = domain.slice(2);
            return hostname.endsWith(wildCardDomain);
          }
          return hostname === domain;
        });

        // 如果域名已经被信任，直接返回
        if (isTrusted) {
          sendResponse({ trusted: true });
          return;
        }

        const params = {
          action: "MULTIPOST_EXTENSION_REQUEST_TRUST_DOMAIN",
          origin: hostname,
        };

        const encodedParams = btoa(JSON.stringify(params));

        const trustDomainListener = (message, _authSender, authSendResponse) => {
          if (message.type === "MULTIPOST_EXTENSION_TRUST_DOMAIN_CONFIRM") {
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
