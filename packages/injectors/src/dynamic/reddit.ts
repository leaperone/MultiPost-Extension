import type { DynamicData, SyncData } from "../types";

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
    const { title, content, images, videos, tags } = data.data as DynamicData;

    // Reddit has shipped both the older shadow-DOM composer and the newer
    // faceplate form. Keep both paths so a staged rollout does not break fill.
    await waitForElement("faceplate-form-section, faceplate-textarea-input");

    const modernTitleSection = document.querySelector(
      'faceplate-form-section[name="type"][pattern="TEXT|VIDEO|IMAGE|GALLERY|LINK|CROSSPOST|AMA"]',
    );
    const modernBodySection =
      document.querySelector('faceplate-form-section[name="type"][pattern="TEXT|IMAGE|VIDEO|LINK|AMA"]') ||
      modernTitleSection;
    const modernEditor = modernBodySection
      ?.querySelector('shreddit-composer[name="body"]')
      ?.querySelector('div[contenteditable="true"]') as HTMLDivElement | null;

    // 如果有媒体文件，点击 Image & Video 标签
    const mediaFiles = [...(images || []), ...(videos || [])];
    if (mediaFiles.length > 0 && !modernEditor) {
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
    const titleTextarea = (modernTitleSection
      ?.querySelector('post-composer-title[name="title"]')
      ?.shadowRoot?.querySelector("textarea") ||
      document
        .querySelector("faceplate-textarea-input")
        ?.shadowRoot?.querySelector('textarea[id="innerTextArea"]')) as HTMLTextAreaElement | null;
    console.debug("titleTextarea", titleTextarea);
    if (!titleTextarea) {
      console.debug("未找到标题元素");
      return;
    }
    titleTextarea.value = title?.slice(0, 300) || "";
    titleTextarea.dispatchEvent(new Event("input", { bubbles: true }));
    titleTextarea.dispatchEvent(new Event("change", { bubbles: true }));

    // 上传媒体文件
    if (mediaFiles.length > 0 && modernEditor) {
      modernEditor.focus();
      const mediaPasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });

      for (const fileData of mediaFiles) {
        console.debug("try upload file", fileData);
        try {
          const response = await fetch(fileData.url);
          const arrayBuffer = await response.arrayBuffer();
          const file = new File([arrayBuffer], fileData.name, { type: fileData.type });
          mediaPasteEvent.clipboardData?.items.add(file);
        } catch (error) {
          console.error("获取文件失败:", error);
        }
      }

      modernEditor.dispatchEvent(mediaPasteEvent);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else if (mediaFiles.length > 0) {
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

    // 新版 composer 使用稳定的 shreddit 结构；旧版回退到原来的第三个编辑器。
    const editors = document.querySelectorAll('div[contenteditable="true"]');
    console.debug("qlEditors", editors);
    const editor = modernEditor || (editors[2] as HTMLDivElement | undefined);
    if (editor) {
      console.debug("qlEditor -->", editor);
      editor.focus();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      const tagSuffix = tags?.length ? ` ${tags.map((t) => `#${t}`).join(" ")}` : "";
      pasteEvent.clipboardData?.setData("text/plain", `${content || ""}${tagSuffix}`);
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
