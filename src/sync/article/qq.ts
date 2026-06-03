import type { ArticleData, SyncData } from "~sync/common";

/**
 * 企鹅号文章发布(experimental,待线上验证)
 *
 * 基于 aibeike 1.6.5 的 QQ ARTICLE DOM 发布路径实现。本环境无法登录目标平台验证,
 * 选择器/流程以参考实现为准,需线上回归。
 */
export async function ArticleQQ(data: SyncData) {
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

    const coverRadio = Array.from(document.querySelectorAll("span.omui-radio__label")).find((element) =>
      element.textContent?.includes("单图"),
    ) as HTMLElement | undefined;
    if (!coverRadio) {
      console.debug("企鹅号:未找到单图封面选项");
      return;
    }

    coverRadio.click();
    await sleep(1000);

    const replaceCover = Array.from(
      document.querySelectorAll("figure.omui-thumb__figure > div.omui-thumb__action > span"),
    ).find((element) => element.textContent === "更换") as HTMLElement | undefined;
    const addCover = coverRadio.parentElement?.parentElement?.nextElementSibling?.querySelector(
      "button > i.omui-icon-plus",
    ) as HTMLElement | null;
    const uploadImageButton = replaceCover || addCover;
    if (!uploadImageButton) {
      console.debug("企鹅号:未找到封面上传按钮");
      return;
    }

    uploadImageButton.click();
    await sleep(1000);

    const uploadTab = Array.from(document.querySelectorAll("li.omui-tab__label")).find((element) =>
      element.textContent?.includes("本地上传"),
    ) as HTMLElement | undefined;
    if (!uploadTab) {
      console.debug("企鹅号:未找到本地上传标签");
      return;
    }

    uploadTab.click();
    await sleep(1000);

    const fileInput = document.querySelector(
      'input[type="file"][accept="image/png,image/jpg,image/jpeg,image/heic,image/heif"]',
    ) as HTMLInputElement | null;
    if (!fileInput) {
      console.debug("企鹅号:未找到封面文件输入框");
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
    }

    await sleep(3000);

    const confirmButton = Array.from(document.querySelectorAll("button.omui-button--primary.omui-button--sm")).find(
      (button) => button.textContent?.includes("确认"),
    ) as HTMLButtonElement | undefined;
    while (confirmButton?.disabled) {
      await sleep(1000);
    }
    if (confirmButton && !confirmButton.disabled) {
      confirmButton.click();
      await sleep(1000);
    }
  }

  try {
    await waitForElement('span[data-placeholder="请输入标题（5-64个字）"]');
    await sleep(1000);

    const countdownTip = document.querySelector('div[class="omui-countdowntip"][_nk="uezG11"]');
    const cancelButton = countdownTip?.querySelector("a") as HTMLElement | null;
    if (cancelButton) {
      cancelButton.click();
      await sleep(3000);
    }

    const titleInput = document.querySelector('span[data-placeholder="请输入标题（5-64个字）"]') as HTMLElement | null;
    if (titleInput) {
      titleInput.innerHTML = articleData.title?.slice(0, 64) || "";
      titleInput.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const editor = document.querySelector('div.ProseMirror[contenteditable="true"]') as HTMLElement | null;
    if (!editor) {
      console.debug("企鹅号:未找到编辑器元素");
      return;
    }

    editor.focus();
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    pasteEvent.clipboardData?.setData("text/html", articleData.htmlContent || "");
    editor.dispatchEvent(pasteEvent);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    editor.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(5000);

    await uploadCover();

    const publishButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "发布",
    ) as HTMLButtonElement | undefined;
    if (publishButton && data.isAutoPublish === true) {
      publishButton.click();
    } else if (!publishButton) {
      console.debug("企鹅号:未找到发布按钮");
    }
  } catch (error) {
    console.error("企鹅号文章发布出错:", error);
  }
}
