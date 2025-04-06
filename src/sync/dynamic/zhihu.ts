import type { DynamicData, SyncData } from '../common';

export async function DynamicZhihu(data: SyncData) {
  const { title, content, images } = data.data as DynamicData;

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

  async function uploadFiles(files: File[]) {
    const fileInput = (await waitForElement('input[type="file"][accept="image/*"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        dataTransfer.items.add(file);
      } else {
        console.warn(`跳过非图片文件: ${file.name}`);
      }
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));

    console.debug('文件上传操作完成');
  }

  try {
    // 等待并点击"写想法"元素
    await waitForElement('div.GlobalWriteV2-topTitle');
    const writeThoughtButton = Array.from(document.querySelectorAll('div.GlobalWriteV2-topTitle')).find(
      (el) => el.textContent?.includes('写想法'),
    );

    if (!writeThoughtButton) {
      console.debug('未找到"写想法"元素');
      return;
    }

    (writeThoughtButton as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 填写标题（如果有）
    const titleInput = (await waitForElement('textarea[placeholder="请输入标题（选填）"]')) as HTMLTextAreaElement;
    if (titleInput && title) {
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 填写内容
    const editorElement = (await waitForElement('div[data-contents="true"]')) as HTMLDivElement;
    if (!editorElement) {
      console.debug('未找到编辑器元素');
      return;
    }

    editorElement.focus();
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData.setData('text/plain', content || '');
    editorElement.dispatchEvent(pasteEvent);
    editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    editorElement.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 处理图片上传
    if (images && images.length > 0) {
      const sendButton = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('发布'));

      if (sendButton) {
        const uploadButton = sendButton.parentElement?.previousElementSibling?.children[1] as HTMLElement;
        if (uploadButton) {
          uploadButton.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));

          await waitForElement('input[type="file"][accept="image/*"]');
          const fileInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
          if (fileInput) {
            const imageFiles = await Promise.all(
              images.map(async (file) => {
                const response = await fetch(file.url);
                const blob = await response.blob();
                return new File([blob], file.name, { type: file.type });
              }),
            );
            await uploadFiles(imageFiles);

            // 等待图片上传完成
            for (let i = 0; i < 30; i++) {
              const uploadedCountElement = document.evaluate(
                "//*[contains(text(), '已上传')]",
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null,
              ).singleNodeValue as HTMLElement;

              if (uploadedCountElement) {
                const match = uploadedCountElement.textContent?.match(/已上传 (\d+) 张图片/);
                if (match && parseInt(match[1]) >= images.length) {
                  console.debug(`图片上传完成：${match[1]}张`);
                  break;
                }
              }
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            const insertButton = Array.from(document.querySelectorAll('button')).find(
              (el) => el.textContent?.includes('插入图片'),
            );
            if (insertButton) {
              insertButton.click();
            }
          }
        }
      }
    }

    // 发布内容
    if (data.isAutoPublish) {
      const maxRetries = 3;
      const retryInterval = 2000; // 2秒

      const attemptPublish = async (): Promise<boolean> => {
        const publishButton = Array.from(document.querySelectorAll('button')).find(
          (el) => el.textContent?.includes('发布'),
        );
        if (publishButton) {
          console.debug('发布按钮被点击');
          publishButton.click();
          return true;
        }
        return false;
      };

      let isPublished = false;
      for (let i = 0; i < maxRetries; i++) {
        isPublished = await attemptPublish();
        if (isPublished) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          window.location.reload();
          break;
        }
        console.debug(`未找到"发布"按钮，重试第 ${i + 1} 次`);
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }

      if (!isPublished) {
        console.error(`在 ${maxRetries} 次尝试后仍未能发布内容`);
      }
    }

    console.debug('成功填入知乎内容和图片');
  } catch (error) {
    console.error('填入知乎内容或上传图片时出错:', error);
  }
}
