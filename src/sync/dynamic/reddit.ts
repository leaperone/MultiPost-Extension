import type { DynamicData, SyncData } from "../common";

export async function DynamicReddit(data: SyncData) {
  console.log("Reddit 函数被调用");

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

  try {
    const { title, content, images, videos } = data.data as DynamicData;

    // 等待页面加载
    await waitForElement("faceplate-textarea-input");

    // 如果有媒体文件，点击 Image & Video 标签
    const mediaFiles = [...(images || []), ...(videos || [])];
    if (mediaFiles.length > 0) {
      const tablist = document
        .querySelector("r-post-type-select")
        ?.shadowRoot?.querySelector("div[role='tablist']")
        ?.querySelectorAll("faceplate-tracker");
      console.debug("tablist", tablist);
      if (tablist && tablist.length > 1) {
        const tabButton = tablist[1].querySelector("button");
        if (tabButton) {
          tabButton.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // 填写标题
    const titleTextarea = document
      .querySelector("faceplate-textarea-input")
      ?.shadowRoot?.querySelector('textarea[id="innerTextArea"]') as HTMLTextAreaElement;
    console.debug("titleTextarea", titleTextarea);
    if (!titleTextarea) {
      console.debug("未找到标题元素");
      return;
    }
    titleTextarea.value = title?.slice(0, 300) || "";
    titleTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    titleTextarea.dispatchEvent(new Event("change", { bubbles: true }));

    // 上传媒体文件
    if (mediaFiles.length > 0) {
      const fileInput = document
        .querySelector("r-post-media-input")
        ?.shadowRoot?.querySelector("input") as HTMLInputElement;
      console.debug("input", fileInput);

      if (fileInput) {
        const dataTransfer = new DataTransfer();
        for (const fileData of mediaFiles) {
          console.debug("try upload file", fileData);
          try {
            const response = await fetch(fileData.url);
            const arrayBuffer = await response.arrayBuffer();
            const file = new File([arrayBuffer], fileData.name, { type: fileData.type });
            dataTransfer.items.add(file);
          } catch (error) {
            console.error("获取文件失败:", error);
          }
        }

        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        fileInput.dispatchEvent(new Event("input", { bubbles: true }));
        console.debug("文件上传操作完成");
      }
    }

    // 填写内容 - 查找第三个 contenteditable div
    const editors = document.querySelectorAll('div[contenteditable="true"]');
    console.debug("qlEditors", editors);
    if (editors && editors.length > 2) {
      const editor = editors[2] as HTMLDivElement;
      console.debug("qlEditor -->", editor);
      editor.focus();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData("text/plain", content || "");
      editor.dispatchEvent(pasteEvent);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // 自动提交
    if (data.isAutoPublish) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const submitButton = document.querySelector("r-post-form-submit-button#submit-post-button");
      console.debug("submitButton", submitButton);
      if (submitButton) {
        const innerButton = submitButton.shadowRoot?.querySelector("button");
        if (innerButton) {
          console.debug("自动发布：点击提交按钮");
          innerButton.click();
        }
      }
    } else {
      console.debug("帖子准备就绪，等待手动发布");
    }
  } catch (error) {
    console.error("Reddit 发布过程中出错:", error);
  }
}
