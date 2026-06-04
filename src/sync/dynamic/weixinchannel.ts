/**
 * @file 微信视频号动态发布同步功能
 * @description 处理动态内容同步发布到微信视频号，支持wujie微前端框架的shadow DOM环境
 * @author Chrome Extension Team
 * @date 2024-01-01
 */

import type { DynamicData, FileData, SyncData } from "../common";

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
        const allElements = root.querySelectorAll("*");
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
        const wujieApp = document.querySelector("wujie-app");

        if (wujieApp?.shadowRoot) {
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
        const wujieApp = document.querySelector("wujie-app");
        if (wujieApp?.shadowRoot) {
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

  async function waitForElementOptional(selector: string, timeout = 8000): Promise<Element | null> {
    return waitForElement(selector, timeout).catch(() => null);
  }

  function queryElement(selector: string): Element | null {
    function findElementInRoot(root: Document | DocumentFragment | ShadowRoot): Element | null {
      const element = root.querySelector(selector);
      if (element) return element;

      const allElements = root.querySelectorAll("*");
      for (const el of allElements) {
        if (el.shadowRoot) {
          const found = findElementInRoot(el.shadowRoot);
          if (found) return found;
        }
      }

      return null;
    }

    return findElementInRoot(document);
  }

  async function findDescriptionEditor(): Promise<HTMLDivElement | null> {
    const Selector = 'div[data-placeholder="添加描述, 1000个字符内"]';
    const legacySelector = "div.input-editor";
    const Editor = queryElement(Selector) as HTMLDivElement | null;
    const legacyEditor = queryElement(legacySelector) as HTMLDivElement | null;
    if (Editor || legacyEditor) return Editor || legacyEditor;

    await waitForElementOptional(`${Selector}, ${legacySelector}`, 1500);
    const waitedEditor = queryElement(Selector) as HTMLDivElement | null;
    const waitedLegacyEditor = queryElement(legacySelector) as HTMLDivElement | null;
    return waitedEditor || waitedLegacyEditor;
  }

  /**
   * Upload image files.
   * @param images - Requested image files.
   * @returns Number of files attached to the upload input.
   */
  async function uploadImages(images: FileData[]): Promise<number> {
    if (images.length === 0) return 0;

    const fileInput = (await waitForElementOptional('input[type="file"][accept="image/*"]')) as HTMLInputElement | null;
    if (!fileInput) {
      console.error("media requested but upload input not found");
      return 0;
    }
    const limitedImages = images.slice(0, 18);

    // Fetch images in order.
    const files: File[] = [];
    for (const image of limitedImages) {
      try {
        const response = await fetch(image.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image "${image.name}": ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const file = new File([blob], image.name, { type: image.type });
        console.log(`图片文件准备就绪: ${file.name} ${file.type} ${file.size}`);
        files.push(file);
      } catch (error) {
        console.error("获取图片失败:", error);
      }
    }

    if (files.length === 0) {
      console.error("media requested but upload could not be performed");
      return 0;
    }

    // Add all files to one DataTransfer.
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }

    try {
      // Focus the file input first.
      fileInput.focus();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Assign all files at once.
      fileInput.files = dataTransfer.files;

      // Dispatch a full event sequence to mimic real user input.
      const events = [
        new Event("focus", { bubbles: true }),
        new Event("change", { bubbles: true, cancelable: true }),
        new Event("input", { bubbles: true, cancelable: true }),
        new Event("blur", { bubbles: true }),
      ];

      for (const event of events) {
        fileInput.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("media upload could not be performed:", error);
      return 0;
    }

    console.log("所有图片上传事件已触发");
    return dataTransfer.files.length;
  }

  try {
    const { content, images, videos, title, tags } = data.data as DynamicData;
    const tagSuffix = tags?.length ? ` ${tags.map((t) => `#${t}`).join(" ")}` : "";
    const finalContent = `${content || ""}${tagSuffix}`;
    const requestedMediaCount = (images?.length ?? 0) + (videos?.length ?? 0);
    let attachedMediaCount = 0;

    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (images && images.length > 0) {
      attachedMediaCount = await uploadImages(images);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Fill the description.
    const editorElement = await findDescriptionEditor();
    if (editorElement) {
      // Clear existing content first.
      editorElement.innerHTML = "";
      editorElement.focus();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Set innerHTML directly.
      editorElement.innerHTML = finalContent;

      // Dispatch the full event sequence.
      const events = [
        new Event("focus", { bubbles: true }),
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        }),
        new Event("input", { bubbles: true, cancelable: true }),
        new Event("change", { bubbles: true, cancelable: true }),
        new Event("keyup", { bubbles: true }),
        new Event("blur", { bubbles: true }),
      ];

      // Set paste data.
      (events[1] as ClipboardEvent).clipboardData?.setData("text/plain", finalContent);

      for (const event of events) {
        editorElement.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } else {
      console.error("未找到视频号描述输入框");
    }

    const titleInput = (await waitForElementOptional(
      'input[placeholder="填写标题, 22个字符内"]',
    )) as HTMLInputElement | null;
    if (titleInput) {
      // Mimic real user input.
      titleInput.focus();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Clear before setting the value.
      titleInput.value = "";
      await new Promise((resolve) => setTimeout(resolve, 100));

      titleInput.value = title || "";

      // Dispatch the full event sequence.
      const titleEvents = [
        new Event("focus", { bubbles: true }),
        new Event("input", { bubbles: true, cancelable: true }),
        new Event("change", { bubbles: true, cancelable: true }),
        new Event("keyup", { bubbles: true }),
        new Event("blur", { bubbles: true }),
      ];

      for (const event of titleEvents) {
        titleInput.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } else {
      console.error("未找到视频号标题输入框");
    }

    // Wait for content input to settle.
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (data.isAutoPublish && requestedMediaCount > 0 && attachedMediaCount !== requestedMediaCount) {
      console.error(
        `only ${attachedMediaCount} of ${requestedMediaCount} requested media attached; skipping auto-publish to avoid an incomplete post`,
      );
      return;
    }

    // 处理发布按钮 - 支持shadow DOM查询
    const wujieApp = document.querySelector("wujie-app");
    let publishButton: HTMLButtonElement | null = null;

    // 优先在shadow-root中查找发布按钮
    if (wujieApp?.shadowRoot) {
      const buttons = wujieApp.shadowRoot.querySelectorAll("button");
      publishButton = Array.from(buttons).find((b) => b.textContent?.trim() === "发表") as HTMLButtonElement;
    }

    // 如果shadow-root中没找到，再在主文档中查找
    if (!publishButton) {
      const buttons = document.querySelectorAll("button");
      publishButton = Array.from(buttons).find((b) => b.textContent?.trim() === "发表") as HTMLButtonElement;
    }

    if (publishButton && data.isAutoPublish) {
      // 确保发布按钮获得焦点
      publishButton.focus();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 模拟真实的鼠标点击行为
      const mouseEvents = [
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
        new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      ];

      for (const event of mouseEvents) {
        publishButton.dispatchEvent(event);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } else if (!publishButton) {
      console.error('未找到"发表"按钮');
    } else {
      console.log("自动发布已关闭，跳过发布操作");
    }
  } catch (error) {
    console.error("WeiXinChannel Dynamic 发布过程中出错:", error);
  }
}
