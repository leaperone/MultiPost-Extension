import type { ArticleData, SyncData } from '~sync/common';

export async function ArticleJuejin(data: SyncData) {
  console.debug('ArticleJuejin', data);

  const articleData = data.data as ArticleData;

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

  // 等待标题输入框出现
  const titleInput = (await waitForElement('input[placeholder="输入文章标题..."]')) as HTMLInputElement;
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 设置标题
  if (titleInput) {
    titleInput.value = articleData.title?.slice(0, 100) || '';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  console.debug('titleInput', titleInput, titleInput?.value);

  // 等待编辑器加载
  const editor = (await waitForElement('div.CodeMirror-code[role="presentation"]')) as HTMLElement;

  if (!editor) {
    console.debug('未找到编辑器元素');
    return;
  }

  // 聚焦编辑器并粘贴内容
  editor.focus();

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer(),
  });

  pasteEvent.clipboardData.setData('text/html', articleData.originContent || '');
  editor.dispatchEvent(pasteEvent);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));

  // 等待内容渲染
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 查找发布按钮
  const buttons = document.querySelectorAll('button');
  const publishButton = Array.from(buttons).find((button) => button.textContent?.includes(' 发布 '));

  console.debug('publishButton', publishButton);

  if (publishButton) {
    if (data.isAutoPublish) {
      console.debug('publishButton clicked');
      const clickEvent = new Event('click', { bubbles: true });
      publishButton.dispatchEvent(clickEvent);
    }
  } else {
    console.debug('未找到"发布"按钮');
  }
}
