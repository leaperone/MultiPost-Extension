import { Storage } from '@plasmohq/storage';
import { getPlatformInfos } from '~sync/common';

const storage = new Storage({ area: 'local' });

const host = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://multipost.app';

export const ping = async (withPlatforms: boolean = false) => {
  const apiKey = await storage.get('apiKey');
  if (!apiKey) {
    return;
  }
  const extensionClientId = (await storage.get('extensionClientId')) || '';
  const body = {
    extensionVersion: chrome.runtime.getManifest().version,
    extensionClientId,
    platformInfos: undefined,
  };
  if (withPlatforms) {
    let platformInfos = await getPlatformInfos();
    platformInfos = platformInfos.map((platform) => {
      const platformCopy = { ...platform };
      delete platformCopy.injectFunction;
      if (platformCopy.accountInfo) {
        delete platformCopy.accountInfo.extraData;
      }
      return platformCopy;
    });
    body.platformInfos = platformInfos;
  }

  const response = await fetch(`${host}/api/extension/ping`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (response.ok) {
    const body = await response.json();
    if (!body.success && body.error === 'KEY_EXPIRED') {
      await storage.remove('apiKey');
    } else if (!body.success && body.error === 'CLIENT_NOT_FOUND') {
      await storage.remove('extensionClientId');
    } else if (body.success && body.data.action === 'NEW_TASK') {
      chrome.tabs.create({ url: body.data.url });
    } else if (body.success && body.data.action === 'NEW_CLIENT') {
      await storage.set('extensionClientId', body.data.clientId);
    }
  }
  return null;
};

export const linkExtensionMessageHandler = async (request, sender, sendResponse) => {
  if (request.action === 'MUTLIPOST_EXTENSION_LINK_EXTENSION') {
    console.log('request', request);
    const params = {
      action: 'MUTLIPOST_EXTENSION_LINK_EXTENSION',
      apiKey: request.data.apiKey,
    };

    const encodedParams = btoa(JSON.stringify(params));

    // 打开信任域名确认窗口
    chrome.windows.create({
      url: chrome.runtime.getURL(`tabs/link-extension.html#${encodedParams}`),
      type: 'popup',
      width: 800,
      height: 600,
    });

    const linkExtensionListener = (message, authSender, authSendResponse) => {
      if (message.type === 'MUTLIPOST_EXTENSION_LINK_EXTENSION_CONFIRM') {
        const { confirm } = message;
        sendResponse({ confirm });
        authSendResponse('success');
        chrome.runtime.onMessage.removeListener(linkExtensionListener);
      }
    };
    chrome.runtime.onMessage.addListener(linkExtensionListener);
  }
};

export const starter = (interval: number) => {
  ping(true);
  setInterval(ping, interval);
};
