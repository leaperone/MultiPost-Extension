import type { ArticleData, SyncData } from "~sync/common";

/**
 * 同花顺文章发布(experimental,待线上验证)
 *
 * Tonghuashun ARTICLE DOM 发布路径实现。选择器与流程需线上回归验证。
 */
export async function ArticleTonghuashun(data: SyncData) {
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

  async function uploadCover(): Promise<void> {
    if (!articleData.cover?.url) return;

    const selectFromLibrary = document.querySelector("div.select-from-library") as HTMLElement | null;
    if (!selectFromLibrary) {
      console.debug("同花顺:未找到图库选择入口");
      return;
    }

    selectFromLibrary.click();
    await sleep(1000);

    const fileInput = document.querySelector("input#upfile") as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("同花顺:未找到封面上传元素");
      return;
    }

    const dataTransfer = new DataTransfer();
    const response = await fetch(articleData.cover.url);
    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], articleData.cover.name, { type: articleData.cover.type });
    dataTransfer.items.add(file);

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(5000);
    }

    const checkList = document.querySelector("ul.check-list.clearfix");
    const firstItem = checkList?.querySelector("li") as HTMLElement | null;
    if (!firstItem) return;

    firstItem.click();
    await sleep(1000);

    const confirmButton = document.querySelector(
      "div.modify-comfirm-btn.dib.lightgraybg.coolbluebg",
    ) as HTMLElement | null;
    if (!confirmButton) return;

    confirmButton.click();
    await sleep(3000);

    const sureButton = document.querySelector("div.D-crop-opera-sure.btn.coolbluebg") as HTMLElement | null;
    if (sureButton) {
      sureButton.click();
      await sleep(1000);
    }
  }

  try {
    await waitForElement("i.icon-editpost.icon-editpost-add");
    await sleep(1000);

    const newArticleButton = document.querySelector("i.icon-editpost.icon-editpost-add") as HTMLElement | null;
    if (newArticleButton) {
      newArticleButton.click();
      await sleep(1000);
    }

    const titleInput = document.querySelector("input#edui1-title") as HTMLInputElement | null;
    if (titleInput) {
      titleInput.value = articleData.title?.slice(0, 36) || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editorIframe = document.getElementById("ueditor_0") as HTMLIFrameElement | null;
    const editorBody = editorIframe?.contentDocument?.body;
    if (!editorBody) {
      console.debug("同花顺:未找到编辑器 iframe");
      return;
    }

    editorBody.innerHTML = articleData.htmlContent || "";
    editorBody.dispatchEvent(new Event("input", { bubbles: true }));
    editorBody.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(3000);

    const nextButton = document.querySelector('a[data-statid="sns_work_desktop.editor.next"]') as HTMLElement | null;
    if (nextButton) {
      nextButton.click();
      await sleep(1000);
      await uploadCover();
    }

    const publishButton = document.querySelector(
      "div.button_publish.item.editor-btn.editor-main-btn",
    ) as HTMLElement | null;
    if (publishButton && data.isAutoPublish === true) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else if (!publishButton) {
      console.debug("同花顺:未找到发布按钮");
    }
  } catch (error) {
    console.error("同花顺文章发布出错:", error);
  }
}
