/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleData, SyncData } from '~sync/common';

export async function ArticleXueqiu(data: SyncData) {

  // 等待元素出现
  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  async function findElementByText(
    selector: string,
    text: string,
    maxRetries = 5,
    retryInterval = 1000,
  ): Promise<Element | null> {
    for (let i = 0; i < maxRetries; i++) {
      const elements = document.querySelectorAll(selector);
      const element = Array.from(elements).find((element) => element.textContent?.includes(text));

      if (element) {
        return element;
      }

      console.log(`未找到包含文本 "${text}" 的元素，尝试次数：${i + 1}`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    console.error(`在 ${maxRetries} 次尝试后未找到包含文本 "${text}" 的元素`);
    return null;
  }

  // 主流程
  const host = document.createElement('div') as HTMLDivElement;
  const tip = document.createElement('div') as HTMLDivElement;

  try {
    // 添加漂浮提示
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
        正在同步文章到雪球...
      </div>
    `;
    shadow.appendChild(tip);

    // 更新提示函数
    function updateTip(message: string) {
      const tipElement = tip.querySelector('.float-tip') as HTMLDivElement;
      if (tipElement) {
        tipElement.textContent = message;
      }
    }

    // 发布文章
    const articleData = data.data as ArticleData;
    const originContent = (data.origin as ArticleData).htmlContent;

    // 等待标题输入框出现
    await waitForElement('textarea[placeholder="请输入标题"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 填写标题
    const titleTextarea = document.querySelector('textarea[placeholder="请输入标题"]') as HTMLTextAreaElement;
    if (titleTextarea) {
      titleTextarea.value = articleData.title?.slice(0, 100) || '';
      titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
    console.debug('titleTextarea', titleTextarea, titleTextarea?.value, articleData.title?.slice(0, 100));

    // 查找编辑器元素
    const editor = document.querySelector('div.ProseMirror[contenteditable="true"]') as HTMLDivElement;
    console.debug('qlEditor', editor);

    if (!editor) {
      console.debug('未找到编辑器元素');
      return;
    }

    // 点击编辑器
    editor.click();

    // 模拟粘贴内容
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/html', originContent || articleData.htmlContent || '');
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));

    // 等待内容加载
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 查找文件上传输入
    const fileInputs = document.querySelectorAll(
      'input[type="file"][accept="image/gif, image/jpeg, image/png"]',
    ) as NodeListOf<HTMLInputElement>;
    console.debug('fileInputs', fileInputs);

    const fileInput = fileInputs[fileInputs.length - 1];
    console.debug('fileInput', fileInput);

    // 如果有封面图片，上传
    if (articleData.cover) {
      const dataTransfer = new DataTransfer();
      console.debug('try upload file', articleData.cover);

      const response = await fetch(articleData.cover.url);
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], articleData.cover.name, { type: articleData.cover.type });

      dataTransfer.items.add(file);
      console.debug('uploaded');

      if (dataTransfer.files.length > 0 && fileInput) {
        fileInput.files = dataTransfer.files;

        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);

        const inputEvent = new Event('input', { bubbles: true });
        fileInput.dispatchEvent(inputEvent);

        console.debug('文件上传操作完成');
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 查找确认裁剪按钮
        const confirmButtons = document.querySelectorAll('button');
        console.debug('confirmButtons', confirmButtons);

        const confirmButton = Array.from(confirmButtons).find((button) => button.textContent?.includes('确认裁剪'));
        console.debug('confirmButton', confirmButton);

        if (confirmButton) {
          const clickEvent = new Event('click', { bubbles: true });
          confirmButton.dispatchEvent(clickEvent);
        }
      }
    }

    // 查找发布按钮
    const sendButton = await findElementByText('button', '发布');

    console.debug('sendButton', sendButton);

    if (sendButton) {
      if (data.isAutoPublish) {
        console.debug('sendButton clicked');
        const clickEvent = new Event('click', { bubbles: true });
        sendButton.dispatchEvent(clickEvent);
      }
    } else {
      console.debug("未找到'发送'按钮");
    }

    updateTip('内容已填写完成');

    // 3秒后移除提示
    setTimeout(() => {
      if (document.body.contains(host)) {
        document.body.removeChild(host);
      }
    }, 3000);
  } catch (error) {
    if (document.body.contains(host)) {
      const floatTip = tip.querySelector('.float-tip') as HTMLDivElement;
      floatTip.textContent = '同步失败，请重试';
      floatTip.style.backgroundColor = '#dc2626';

      setTimeout(() => {
        document.body.removeChild(host);
      }, 3000);
    }

    console.error('发布文章失败:', error);
    throw error;
  }
}
