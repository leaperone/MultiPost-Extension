import type { SyncData } from '../common';

interface WebhookConfig {
  urls: string[];
}

// 优先发布图文
export async function DynamicWebhook(data: SyncData) {
  console.log('DynamicWebhook', data);
  const extraConfig = data.platforms.find((platform) => platform.name === 'DYNAMIC_WEBHOOK')
    ?.extraConfig as WebhookConfig;

  // 创建浮动提示
  function createFloatingTip() {
    const host = document.createElement('div');
    const tip = document.createElement('div');

    host.style.position = 'fixed';
    host.style.bottom = '20px';
    host.style.right = '20px';
    host.style.zIndex = '9999';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    tip.innerHTML = `
    <style>
      .float-tip {
        background: #1e293b;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    </style>
    <div class="float-tip">
      正在发布内容到 Webhook...
    </div>
  `;
    shadow.appendChild(tip);

    return {
      host,
      updateMessage: (message: string) => {
        const tipElement = shadow.querySelector('.float-tip');
        if (tipElement) {
          tipElement.textContent = message;
        }
      },
      remove: () => {
        setTimeout(() => {
          document.body.removeChild(host);
        }, 3000);
      },
    };
  }

  const floatingTip = createFloatingTip();

  const getMessageBody = (url: string, content: string) => {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname === 'qyapi.weixin.qq.com' || hostname === 'oapi.dingtalk.com') {
      return {
        msgtype: 'text',
        text: {
          content: content,
        },
      };
    }

    // 默认消息格式
    return {
      msg_type: 'text',
      content: {
        text: content,
      },
    };
  };

  const sendMessageCheck = async (url: string, content: string): Promise<boolean> => {
    try {
      const messageBody = getMessageBody(url, content);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  };

  let successCount = 0;
  for (const url of extraConfig.urls) {
    const content = data.data.title ? `${data.data.title}\n${data.data.content}` : data.data.content;
    const isValid = await sendMessageCheck(url, content);
    if (isValid) {
      successCount++;
      console.log('Webhook成功:', url);
      floatingTip.updateMessage(`已成功发布到 ${successCount}/${extraConfig.urls.length} 个 Webhook`);
    }
  }

  if (successCount === extraConfig.urls.length) {
    floatingTip.updateMessage('所有 Webhook 发布成功！');
  } else {
    floatingTip.updateMessage(`部分 Webhook 发布失败，成功 ${successCount}/${extraConfig.urls.length}`);
  }
  floatingTip.remove();
}
