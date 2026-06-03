import type { ArticleData, SyncData } from "~sync/common";

/**
 * 懂车号文章发布(experimental,待线上验证)
 *
 * Dongchedi ARTICLE DOM 发布路径实现。选择器与流程需线上回归验证。
 */
export async function ArticleDongchedi(data: SyncData) {
  const articleData = data.data as ArticleData;

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function waitForElement(selector: string, timeout = 15000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
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
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  function findEditorIframe(): HTMLIFrameElement | null {
    const ueditorIframe = document.querySelector("iframe#ueditor_0") as HTMLIFrameElement | null;
    if (ueditorIframe) return ueditorIframe;

    const editorIframes = Array.from(document.querySelectorAll('iframe[id^="ueditor_"]')) as HTMLIFrameElement[];
    if (editorIframes.length > 0) return editorIframes[0];

    const iframeWithEditableBody = Array.from(document.querySelectorAll("iframe")).find((iframe) => {
      const body = (iframe as HTMLIFrameElement).contentDocument?.body;
      return Boolean(body?.isContentEditable || body?.className || body?.children.length);
    }) as HTMLIFrameElement | undefined;

    return iframeWithEditableBody || null;
  }

  async function uploadCover(): Promise<void> {
    if (!articleData.cover?.url) return;

    const coverUpload = document.querySelector("div.fake-upload-trigger") as HTMLElement | null;
    if (!coverUpload) return;

    coverUpload.click();
    await sleep(1000);

    const localUpload = Array.from(document.querySelectorAll("li")).find((element) =>
      element.textContent?.includes("本地上传"),
    ) as HTMLElement | undefined;
    if (!localUpload) return;

    localUpload.click();
    await sleep(1000);

    const fileInput = document.querySelector("div.xigua-upload-poster-trigger > input") as HTMLInputElement | null;
    if (!fileInput) return;

    const dataTransfer = new DataTransfer();
    const response = await fetch(articleData.cover.url);
    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], articleData.cover.name, { type: articleData.cover.type });
    dataTransfer.items.add(file);

    if (dataTransfer.files.length === 0) return;

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(3000);

    const clipButton = document.querySelector("div.clip-btn-content") as HTMLElement | null;
    if (clipButton) {
      clipButton.click();
      await sleep(1000);
    }

    const doneButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "确定");
    if (doneButton) {
      doneButton.click();
      await sleep(1000);

      const confirmButton = document.querySelector("button.m-button.red") as HTMLButtonElement | null;
      confirmButton?.click();
    }
  }

  try {
    await waitForElement("textarea");
    await sleep(1000);

    const titleTextarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
    if (titleTextarea) {
      titleTextarea.value = articleData.title || "";
      titleTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      titleTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    }

    await waitForElement("iframe");
    const editorIframe = findEditorIframe();
    const editorBody = editorIframe?.contentDocument?.body;
    if (!editorBody) {
      console.debug("懂车号:未找到编辑器 iframe");
      return;
    }

    editorBody.innerHTML = articleData.htmlContent || "";
    editorBody.dispatchEvent(new Event("input", { bubbles: true }));
    editorBody.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(3000);

    await uploadCover();

    const publishButton = Array.from(document.querySelectorAll("button.publish-btn")).find((button) =>
      button.textContent?.includes("预览并发布"),
    ) as HTMLButtonElement | undefined;
    if (publishButton && data.isAutoPublish === true) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else if (!publishButton) {
      console.debug("懂车号:未找到发布按钮");
    }
  } catch (error) {
    console.error("懂车号文章发布出错:", error);
  }
}
