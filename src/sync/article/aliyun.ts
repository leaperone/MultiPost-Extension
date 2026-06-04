/**
 * Aliyun article publishing (experimental, needs live verification).
 *
 * Aliyun ARTICLE DOM path.
 */
import TurndownService from "turndown";
import type { ArticleData, FileData, SyncData } from "~sync/common";

export async function ArticleAliyun(data: SyncData) {
  const articleData = data.data as ArticleData;

  interface AliyunUploadUrlResult {
    data?: {
      uploadUrl?: string;
      imageUrl?: string;
    };
  }

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

  async function waitForElementOptional(selector: string, timeout = 15000): Promise<Element | null> {
    return waitForElement(selector, timeout).catch(() => null);
  }

  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? (parts.pop()?.split(";").shift() ?? null) : null;
  }

  function setControlValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const prototype =
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function createFile(fileData: FileData): Promise<File | null> {
    try {
      const response = await fetch(fileData.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new File([blob], fileData.name, { type: fileData.type || blob.type || "application/octet-stream" });
    } catch {
      console.warn("Aliyun inline image fetch failed; skipping inline image");
      return null;
    }
  }

  async function uploadInlineImage(fileData: FileData): Promise<string | null> {
    const csrf = getCookie("c_csrf");
    if (!csrf) {
      console.debug("Aliyun c_csrf cookie not found; keeping original inline image URL");
      return null;
    }

    const file = await createFile(fileData);
    if (!file) return null;

    try {
      const uploadUrlResponse = await fetch(
        `https://developer.aliyun.com/developer/api/image/getImageUploadUrl?p_csrf=${csrf}`,
        {
          method: "POST",
          body: JSON.stringify({
            imageName: fileData.name,
            imageSize: fileData.size ?? file.size,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );
      if (!uploadUrlResponse.ok) throw new Error(`HTTP ${uploadUrlResponse.status}`);

      const uploadUrlResult = (await uploadUrlResponse.json()) as AliyunUploadUrlResult;
      const uploadUrl = uploadUrlResult.data?.uploadUrl?.replace(/^http:\/\//, "https://");
      const imageUrl = uploadUrlResult.data?.imageUrl || null;
      if (!uploadUrl || !imageUrl) {
        console.debug("aliyun: invalid upload-url response; skipping inline image");
        return null;
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "x-oss-meta-author": "ucc",
          "content-type": file.type,
        },
      });
      if (!uploadResponse.ok) throw new Error(`HTTP ${uploadResponse.status}`);

      return imageUrl;
    } catch {
      console.warn("Aliyun inline image upload failed; keeping original inline image URL");
      return null;
    }
  }

  async function rewriteInlineImages(htmlContent: string, images: FileData[]): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const imageElements = Array.from(doc.getElementsByTagName("img"));

    for (const imageElement of imageElements) {
      const src = imageElement.getAttribute("src");
      if (!src) continue;

      const imageData = images.find((image) => image.url === src);
      if (!imageData) {
        console.debug("Aliyun inline image data not found; keeping original inline image URL");
        continue;
      }

      const newSrc = await uploadInlineImage(imageData);
      if (newSrc) {
        imageElement.setAttribute("src", newSrc);
      }
    }

    return doc.body.innerHTML;
  }

  async function rewriteMarkdownImages(markdownContent: string, images: FileData[]): Promise<string> {
    let processedContent = markdownContent;
    const matches = Array.from(markdownContent.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g));

    for (const match of matches) {
      const [fullMatch, alt, src] = match;
      const imageData = images.find((image) => image.url === src);
      if (!imageData) continue;

      const newSrc = await uploadInlineImage(imageData);
      if (newSrc) {
        processedContent = processedContent.replace(fullMatch, `![${alt}](${newSrc})`);
      }
    }

    return processedContent;
  }

  async function prepareMarkdownBody(articleData: ArticleData): Promise<string> {
    const images = articleData.images ?? [];
    if (articleData.htmlContent) {
      const rewrittenHtml = await rewriteInlineImages(articleData.htmlContent, images);
      const turndownService = new TurndownService({
        codeBlockStyle: "fenced",
        headingStyle: "atx",
      });
      return turndownService.turndown(rewrittenHtml) || articleData.markdownContent || "";
    }

    return rewriteMarkdownImages(articleData.markdownContent || "", images);
  }

  async function clickPublishButton(): Promise<void> {
    await sleep(1000);
    const buttons = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
    const publishButton = buttons.find((element) => {
      const text = element.textContent?.trim();
      return text === "发布" || text === "发布文章" || text?.includes("发布文章");
    });
    if (publishButton) {
      publishButton.dispatchEvent(new Event("click", { bubbles: true }));
    } else {
      console.debug("阿里云:未找到发布按钮");
    }
  }

  function canAutoPublish(required: { title: boolean; body: boolean }): boolean {
    const missing = [
      ["title", required.title],
      ["body", required.body],
    ].filter(([, filled]) => !filled);

    for (const [field] of missing) {
      console.error(`Aliyun required field ${field} not filled; skipping auto-publish`);
    }

    return missing.length === 0;
  }

  try {
    await waitForElementOptional('input[placeholder="请填写标题"], textarea.textarea');
    await sleep(1000);

    const required = {
      title: false,
      body: false,
    };

    const titleInput = document.querySelector('input[placeholder="请填写标题"]') as HTMLInputElement | null;
    if (titleInput) {
      setControlValue(titleInput, articleData.title || "");
      required.title = !!articleData.title;
    } else {
      console.debug("阿里云:未找到标题输入框");
    }

    const summaryTextarea = document.querySelector('textarea[placeholder="请填写摘要"]') as HTMLTextAreaElement | null;
    if (summaryTextarea) {
      setControlValue(summaryTextarea, articleData.digest || "");
    }

    const markdownTextarea = document.querySelector("textarea.textarea") as HTMLTextAreaElement | null;
    if (!markdownTextarea) {
      console.debug("阿里云:未找到 Markdown 编辑器 textarea");
      return;
    }

    const markdownBody = await prepareMarkdownBody(articleData);
    markdownTextarea.focus();
    setControlValue(markdownTextarea, markdownBody);
    required.body = !!markdownBody;

    if (data.isAutoPublish === true && canAutoPublish(required)) {
      await clickPublishButton();
    }
  } catch (error) {
    console.error("阿里云文章发布出错:", error);
  }
}
