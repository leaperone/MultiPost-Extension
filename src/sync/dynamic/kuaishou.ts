import type { DynamicData, SyncData } from "../common";

/**
 * 快手图文动态发布函数
 * @description 优先发布图文内容到快手平台
 * @param {SyncData} data - 同步数据，包含标题、内容、图片等信息
 */
export async function DynamicKuaishou(data: SyncData) {
  const { title, content, images } = data.data as DynamicData;

  // 检查图片数量
  if (!images || images.length === 0) {
    alert("发布图文，请至少提供一张图片");
    return;
  }

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

  // 模拟拖拽事件的函数
  function simulateDragAndDrop(element: HTMLElement, dataTransfer: DataTransfer) {
    const events = [
      new DragEvent("dragenter", { bubbles: true }),
      new DragEvent("dragover", { bubbles: true }),
      new DragEvent("drop", { bubbles: true, dataTransfer: dataTransfer }),
    ];
    events.forEach((event) => {
      Object.defineProperty(event, "preventDefault", { value: () => {} });
    });
    events.forEach((event) => {
      element.dispatchEvent(event);
    });
  }

  // 等待文件输入元素
  await waitForElement('input[type="file"]');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 查找并点击上传图片的tab
  const uploadTab = document.querySelector("div#rc-tabs-0-tab-2") as HTMLElement;
  if (!uploadTab) {
    console.error("未找到 uploadTab");
    return;
  }
  uploadTab.click();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 创建 DataTransfer 对象并添加文件
  const dataTransfer = new DataTransfer();
  for (const fileInfo of images) {
    console.log("try upload file", fileInfo);
    try {
      const response = await fetch(fileInfo.url);
      if (!response.ok) {
        throw new Error(`HTTP 错误! 状态: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const file = new File([arrayBuffer], fileInfo.name, { type: fileInfo.type });
      dataTransfer.items.add(file);
    } catch (error) {
      console.error(`上传图片 ${fileInfo.url} 失败:`, error);
    }
  }

  // 查找上传图片按钮
  const buttons = document.querySelectorAll("button");
  const uploadButton = Array.from(buttons).find((button) => button.textContent === "上传图片") as HTMLElement;

  if (!uploadButton) {
    console.error("未找到'上传图片'按钮");
    return;
  }

  // 执行拖拽上传
  const dropTarget = uploadButton.parentElement?.parentElement as HTMLElement;
  simulateDragAndDrop(dropTarget, dataTransfer);
  console.log("文件上传操作完成");

  // 等待描述输入框出现
  await waitForElement('div[placeholder="添加合适的话题和描述，作品能获得更多推荐～"][contenteditable="true"]');

  // 查找描述输入框并粘贴内容
  const descriptionInput = document.querySelector(
    'div[placeholder="添加合适的话题和描述，作品能获得更多推荐～"][contenteditable="true"]',
  ) as HTMLDivElement;

  if (descriptionInput) {
    descriptionInput.focus();

    // 拼接标题和内容，如果有标题则用 \n 分隔
    const textContent = title ? `${title}\n${content}` : content;

    // 使用 ClipboardEvent 粘贴内容
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/plain", textContent);
    descriptionInput.dispatchEvent(pasteEvent);
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 如果是自动发布，提示需要手动确认
  if (data.isAutoPublish) {
    alert("为确保内容符合预期，请手动确认发布");
  }
}
