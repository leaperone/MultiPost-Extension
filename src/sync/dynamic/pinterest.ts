// Experimental publisher (待线上验证)
import type { DynamicData, SyncData } from "~sync/common";

export async function DynamicPinterest(data: SyncData) {
  function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const exist = document.querySelector(selector);
      if (exist) {
        resolve(exist);
        return;
      }

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`元素 "${selector}" 在 ${timeout}ms 内未出现`));
      }, timeout);
    });
  }

  function sleep(timeout: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }

  try {
    const { title, content, images } = data.data as DynamicData;

    await waitForElement("input#storyboard-upload-input");
    if (images.length > 0) {
      const fileInputs = document.querySelectorAll('input#storyboard-upload-input[type="file"]');
      console.debug("fileInputs", fileInputs);
      if (!fileInputs.length) {
        console.debug("未找到文件输入元素");
        return;
      }

      const fileInput = fileInputs[fileInputs.length - 1] as HTMLInputElement;
      const fileDataTransfer = new DataTransfer();
      for (const image of images) {
        console.debug("try upload file", image);
        const response = await fetch(image.url);
        const arrayBuffer = await response.arrayBuffer();
        const file = new File([arrayBuffer], image.name, { type: image.type });
        fileDataTransfer.items.add(file);
      }

      fileInput.files = fileDataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.debug("文件上传操作完成");
    }

    await waitForElement("input#storyboard-selector-title:not(:disabled)");
    const titleInput = document.querySelector(
      "input#storyboard-selector-title:not(:disabled)",
    ) as HTMLInputElement | null;
    console.debug("titleInput", titleInput);
    if (titleInput) {
      titleInput.value = title || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const editor = document.querySelector('div[contenteditable="true"]') as HTMLElement | null;
    console.debug("qlEditor", editor);
    if (!editor) {
      console.debug("未找到编辑器元素");
      return;
    }

    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/plain", content || "");
    editor.dispatchEvent(pasteEvent);
    await sleep(1000);

    const sendButton = document.querySelector(
      'div[data-test-id="storyboard-creation-nav-done"] button',
    ) as HTMLElement | null;
    console.debug("sendButton", sendButton);
    if (sendButton) {
      if (data.isAutoPublish === true) {
        console.debug("sendButton clicked");
        sendButton.dispatchEvent(new Event("click", { bubbles: true }));
      }
    } else {
      console.debug("未找到'发送'按钮");
    }
  } catch (error) {
    console.error("Pinterest 动态发布失败:", error);
  }
}
