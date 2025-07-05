/**
 * @file 微信视频号发布同步功能
 * @description 处理视频同步发布到微信视频号，支持wujie微前端框架的shadow DOM环境
 * @author Chrome Extension Team
 * @date 2024-01-01
 */

import type { SyncData, VideoData } from '../common';

/**
 * 微信视频号视频发布处理函数
 * @description 自动化填写视频标题、描述、标签，上传视频文件，处理原创声明和发布操作
 * @param data - 同步数据，包含视频信息和发布配置
 * @throws {Error} 当查找关键元素失败或发布过程出错时抛出错误
 */
export async function VideoWeiXinChannel(data: SyncData) {
  /**
   * 等待元素出现，支持Shadow DOM查询
   * @param selector - CSS选择器
   * @param timeout - 超时时间（毫秒）
   * @returns Promise<Element> 找到的元素
   */
  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      /**
       * 在指定根节点下查找元素，支持Shadow DOM
       * @param root - 根节点
       * @returns Element | null 找到的元素或null
       */
      function findElementInRoot(root: Document | DocumentFragment | ShadowRoot): Element | null {
        // 先在当前根节点下查找
        const element = root.querySelector(selector);
        if (element) return element;

        // 查找所有可能包含shadow-root的元素
        const allElements = root.querySelectorAll('*');
        for (const el of allElements) {
          if (el.shadowRoot) {
            const found = findElementInRoot(el.shadowRoot);
            if (found) return found;
          }
        }

        return null;
      }

      /**
       * 查找wujie-app的shadow-root并在其中搜索元素
       * @returns Element | null 找到的元素或null
       */
      function findInWujieApp(): Element | null {
        // 查找wujie-app元素
        const wujieApp = document.querySelector('wujie-app');

        if (wujieApp && wujieApp.shadowRoot) {
          const element = wujieApp.shadowRoot.querySelector(selector);

          if (element) {
            return element;
          }

          // 如果直接查找失败，尝试递归查找
          return findElementInRoot(wujieApp.shadowRoot);
        }

        // 如果没有找到wujie-app，尝试在整个文档中查找
        return findElementInRoot(document);
      }

      // 首次查找
      const element = findInWujieApp();
      if (element) {
        resolve(element);
        return;
      }

      // 设置MutationObserver监听DOM变化
      const observer = new MutationObserver(() => {
        const element = findInWujieApp();
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      // 观察整个document的变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 特别处理wujie-app的shadow-root
      const checkWujieApp = () => {
        const wujieApp = document.querySelector('wujie-app');
        if (wujieApp && wujieApp.shadowRoot) {
          const shadowObserver = new MutationObserver(() => {
            const element = wujieApp.shadowRoot!.querySelector(selector);
            if (element) {
              resolve(element);
              observer.disconnect();
              shadowObserver.disconnect();
            }
          });

          shadowObserver.observe(wujieApp.shadowRoot, {
            childList: true,
            subtree: true,
          });

          // 超时时也要断开shadow observer
          setTimeout(() => {
            shadowObserver.disconnect();
          }, timeout);
        }
      };

      // 立即检查一次
      checkWujieApp();

      // 定期重新检查wujie-app（防止wujie-app后加载）
      const intervalCheck = setInterval(() => {
        const element = findInWujieApp();
        if (element) {
          resolve(element);
          observer.disconnect();
          clearInterval(intervalCheck);
        }
      }, 1000);

      // 设置超时
      setTimeout(() => {
        observer.disconnect();
        clearInterval(intervalCheck);
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * 上传视频文件
   * @param file - 视频文件
   */
  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发文件选择变化事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
    const inputEvent = new Event('input', { bubbles: true });
    fileInput.dispatchEvent(inputEvent);

    console.log('视频上传事件已触发');
  }

  /**
   * 上传视频封面
   * @param cover 封面图片信息
   */
  async function uploadCover(cover: { url: string; name: string; type?: string }): Promise<void> {
    try {
      console.debug('tryCover', cover);

      const coverUploadButton = (await waitForElement('div.video-cover div.tag-inner')) as HTMLElement;
      console.debug('coverUpload', coverUploadButton);

      if (!coverUploadButton) return;

      while (coverUploadButton.parentElement?.classList.contains('disabled')) {
        console.debug('coverUpload is disabled, wait 3s');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      coverUploadButton.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const wujieApp = document.querySelector('wujie-app');
      const root = wujieApp?.shadowRoot || document;

      const fileInput = root.querySelector("div.crop-area input[type='file']") as HTMLInputElement;

      if (!fileInput) {
        console.error('封面上传文件输入框未找到');
        return;
      }
      console.debug('fileInput', fileInput);

      const dataTransfer = new DataTransfer();
      if (cover.type && cover.type.includes('image/')) {
        console.debug('try upload file', cover);
        const response = await fetch(cover.url);
        const arrayBuffer = await response.arrayBuffer();
        const imageFile = new File([arrayBuffer], cover.name, {
          type: cover.type,
        });
        dataTransfer.items.add(imageFile);
      }

      if (dataTransfer.files.length === 0) return;

      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.debug('文件上传操作触发');

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const h3s = root.querySelectorAll('h3');
      console.debug('h3s', h3s);
      const cropTitle = Array.from(h3s).find((h) => h.textContent === '裁剪封面图');

      if (cropTitle) {
        console.debug('h3', cropTitle);
        const doneButtons = root.querySelectorAll('div.finder-dialog-footer button');
        console.debug('doneButtons', doneButtons);
        const doneButton = Array.from(doneButtons).find((b) => b.textContent === '确定') as HTMLButtonElement;
        if (doneButton) {
          console.debug('doneButton', doneButton);
          doneButton.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const finalConfirmButtons = root.querySelectorAll('div.finder-dialog-footer button');
      console.debug('doneButtons', finalConfirmButtons);
      const confirmButton = Array.from(finalConfirmButtons).find((b) => b.textContent === '确认') as HTMLButtonElement;

      if (confirmButton) {
        console.debug('doneButton', confirmButton);
        confirmButton.click();
      }
    } catch (error) {
      console.error('uploadCover failed:', error);
    }
  }

  try {
    const { content, video, title, tags = [], cover } = data.data as VideoData;

    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log('视频上传已初始化');
    }

    // 等待视频上传完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理标题输入
    const titleInput = (await waitForElement(
      'input[placeholder="概括视频主要内容，字数建议6-16个字符"]',
    )) as HTMLInputElement;
    titleInput.value = title;
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));

    // 处理内容和标签输入
    const descriptionInput = (await waitForElement('div[data-placeholder="添加描述"]')) as HTMLDivElement;

    if (descriptionInput) {
      // 输入主要内容
      descriptionInput.focus();
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData.setData('text/plain', content || '');
      descriptionInput.dispatchEvent(pasteEvent);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // 添加标签
      for (const tag of tags) {
        console.log('添加标签:', tag);
        descriptionInput.focus();

        const tagPasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        });
        tagPasteEvent.clipboardData.setData('text/plain', ` #${tag}`);
        descriptionInput.dispatchEvent(tagPasteEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const enterEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
        });
        descriptionInput.dispatchEvent(enterEvent);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (cover) {
      await uploadCover(cover);
    }

    // 处理原创声明
    const originalInput = (await waitForElement(
      'input[type="checkbox"][class="ant-checkbox-input"]',
    )) as HTMLInputElement;

    if (originalInput) {
      originalInput.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 在shadow-root中查找声明输入框
      const wujieApp = document.querySelector('wujie-app');
      let declareInput: HTMLInputElement | null = null;

      if (wujieApp && wujieApp.shadowRoot) {
        declareInput = wujieApp.shadowRoot.querySelector(
          'div.declare-body-wrapper input[type="checkbox"][class="ant-checkbox-input"]',
        ) as HTMLInputElement;
      }

      if (declareInput) {
        declareInput.click();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 在shadow-root中查找声明原创按钮
        const buttons =
          wujieApp?.shadowRoot?.querySelectorAll('button[type="button"]') ||
          document.querySelectorAll('button[type="button"]');

        for (const button of Array.from(buttons)) {
          if (button.textContent === '声明原创') {
            console.log('点击声明原创按钮');
            (button as HTMLElement).click();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            break;
          }
        }
      }
    }

    // 等待内容填写完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理发布按钮 - 支持shadow DOM查询
    const wujieApp = document.querySelector('wujie-app');
    let publishButton: HTMLButtonElement | null = null;

    // 优先在shadow-root中查找发布按钮
    if (wujieApp && wujieApp.shadowRoot) {
      const buttons = wujieApp.shadowRoot.querySelectorAll('button');
      publishButton = Array.from(buttons).find((b) => b.textContent?.trim() === '发表') as HTMLButtonElement;
    }

    // 如果shadow-root中没找到，再在主文档中查找
    if (!publishButton) {
      const buttons = document.querySelectorAll('button');
      publishButton = Array.from(buttons).find((b) => b.textContent?.trim() === '发表') as HTMLButtonElement;
    }

    if (publishButton) {
      if (data.isAutoPublish) {
        console.log('点击发布按钮');
        publishButton.click();
      }
    } else {
      console.error('未找到"发表"按钮');
    }
  } catch (error) {
    console.error('WeiXinVideo 发布过程中出错:', error);
  }
}
