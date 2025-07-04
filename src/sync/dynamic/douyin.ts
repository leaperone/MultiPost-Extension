import type { DynamicData, SyncData } from '../common';

// 优先发布图文
export async function DynamicDouyin(data: SyncData) {
  const { title, content, images } = data.data as DynamicData;
  // 辅助函数：等待元素出现
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

  if (!images || images.length === 0) {
    alert('发布图文，请至少提供一张图片');
    return;
  }

  await waitForElement('input[type="file"]');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const semiTabs = document.querySelector('.semi-tabs.semi-tabs-top');
  console.debug('semitabs', semiTabs);
  if (!semiTabs || !semiTabs.previousElementSibling) {
    console.error('未找到 semitabs 或其前置元素');
    return;
  }
  const tabsDiv = semiTabs.previousElementSibling.querySelectorAll('div');
  console.debug('tabsDiv', tabsDiv);
  const publishTab = Array.from(tabsDiv).find((e) => e.textContent === '发布图文');
  console.debug('publishTab', publishTab);
  if (!publishTab) {
    console.error('未找到 publishTab');
    return;
  }
  (publishTab as HTMLDivElement).click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const fileInput = document.querySelector(
    'input[accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp,image/tif"]',
  ) as HTMLInputElement;
  console.debug('fileInput', fileInput);
  if (!fileInput) {
    console.error('未找到 fileInput');
    return;
  }

  const dataTransfer = new DataTransfer();
  for (const fileInfo of images) {
    console.debug('try upload file', fileInfo);
    const response = await fetch(fileInfo.url);
    const blob = await response.blob();
    const file = new File([blob], fileInfo.name, { type: fileInfo.type });
    dataTransfer.items.add(file);
  }
  fileInput.files = dataTransfer.files;
  const changeEvent = new Event('change', { bubbles: true });
  fileInput.dispatchEvent(changeEvent);
  const inputEvent = new Event('input', { bubbles: true });
  fileInput.dispatchEvent(inputEvent);
  console.debug('文件上传操作完成');

  await waitForElement('input[placeholder="添加作品标题"]');
  const titleInput = document.querySelector('input[placeholder="添加作品标题"]') as HTMLInputElement;
  console.debug('titleInput', titleInput);
  if (titleInput) {
    titleInput.value = title || '';
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const contentEditor = document.querySelector(
    'div.zone-container.editor-kit-container.editor.editor-comp-publish[contenteditable="true"]',
  ) as HTMLDivElement;
  if (contentEditor) {
    console.debug('descriptionInput', contentEditor);
    contentEditor.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });

    pasteEvent.clipboardData.setData('text/plain', content || '');
    contentEditor.dispatchEvent(pasteEvent);
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));

  if (data.isAutoPublish) {
    const buttons = document.querySelectorAll('button');
    const publishButton = Array.from(buttons).find((e) => e.textContent === '发布');
    if (publishButton) {
      console.debug('sendButton clicked');
      (publishButton as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 10000));
      window.location.href = 'https://creator.douyin.com/creator-micro/content/manage';
    } else {
      console.debug("未找到'发布'按钮");
    }
  }
}
