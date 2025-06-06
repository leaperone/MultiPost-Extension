/**
 * @file 微信视频号动态发布同步功能
 * @description 处理动态内容同步发布到微信视频号，支持wujie微前端框架的shadow DOM环境
 * @author Chrome Extension Team
 * @date 2024-01-01
 */

import type { SyncData, DynamicData, FileData } from '../common';

/**
 * 微信视频号动态发布处理函数
 * @description 自动化填写动态标题、内容，上传图片，处理发布操作
 * @param data - 同步数据，包含动态信息和发布配置
 * @throws {Error} 当查找关键元素失败或发布过程出错时抛出错误
 */
export async function DynamicWeiXinChannel(data: SyncData) {
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
   * 上传图片文件
   * @param images - 图片文件数组
   */
  async function uploadImages(images: FileData[]): Promise<void> {
    const fileInput = (await waitForElement('input[type="file"][accept="image/*"]')) as HTMLInputElement;

    const dataTransfer = new DataTransfer();

    // 使用Promise.all等待所有图片加载完成
    await Promise.all(
      images.map(async (image) => {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const file = new File([blob], image.name, { type: image.type });
        console.log(`图片文件: ${file.name} ${file.type} ${file.size}`);
        dataTransfer.items.add(file);
      }),
    );

    // 先聚焦到文件输入框
    fileInput.focus();
    await new Promise((resolve) => setTimeout(resolve, 200));

    fileInput.files = dataTransfer.files;

    // 触发更完整的事件序列来模拟真实用户行为
    const events = [
      new Event('focus', { bubbles: true }),
      new Event('change', { bubbles: true, cancelable: true }),
      new Event('input', { bubbles: true, cancelable: true }),
      new Event('blur', { bubbles: true }),
    ];

    for (const event of events) {
      fileInput.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('图片上传事件已触发');
  }

  try {
    const { content, images, title } = data.data as DynamicData;

    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (images) {
      await uploadImages(images);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理内容输入
    const editorElement = (await waitForElement('div.input-editor')) as HTMLDivElement;
    if (editorElement) {
      // 先清空内容
      editorElement.innerHTML = '';
      editorElement.focus();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 直接设置innerHTML
      editorElement.innerHTML = content || '';

      // 触发完整的事件序列
      const events = [
        new Event('focus', { bubbles: true }),
        new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        }),
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new Event('keyup', { bubbles: true }),
        new Event('blur', { bubbles: true }),
      ];

      // 设置粘贴事件的数据
      (events[1] as ClipboardEvent).clipboardData?.setData('text/plain', content || '');

      for (const event of events) {
        editorElement.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const titleInput = (await waitForElement('input[placeholder="填写标题, 22个字符内"]')) as HTMLInputElement;

    // 模拟真实用户输入行为
    titleInput.focus();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 先清空再设置值
    titleInput.value = '';
    await new Promise((resolve) => setTimeout(resolve, 100));

    titleInput.value = title;

    // 触发完整的事件序列
    const titleEvents = [
      new Event('focus', { bubbles: true }),
      new Event('input', { bubbles: true, cancelable: true }),
      new Event('change', { bubbles: true, cancelable: true }),
      new Event('keyup', { bubbles: true }),
      new Event('blur', { bubbles: true }),
    ];

    for (const event of titleEvents) {
      titleInput.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 100));
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

    if (publishButton && data.isAutoPublish) {
      // 确保发布按钮获得焦点
      publishButton.focus();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 模拟真实的鼠标点击行为
      const mouseEvents = [
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      ];

      for (const event of mouseEvents) {
        publishButton.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

    } else if (!publishButton) {
      console.error('未找到"发表"按钮');
    } else {
      console.log('自动发布已关闭，跳过发布操作');
    }
  } catch (error) {
    console.error('WeiXinChannel Dynamic 发布过程中出错:', error);
  }
}
