/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleData, FileData, SyncData } from "../types";

interface WeiboDraftEndpoint {
  version: string;
  editorUrl: string;
  createUrl: string;
  saveUrl: string;
}

interface DraftRequestResult {
  ok: boolean;
  json?: any;
  id?: string;
}

const WEIBO_DRAFT_SUCCESS_CODE = 100000;

export async function ArticleWeibo(data: SyncData) {
  const articleData = data.data as ArticleData;
  const draftEndpoints: WeiboDraftEndpoint[] = [
    {
      version: "v5",
      editorUrl: "https://card.weibo.com/article/v5/editor",
      createUrl: "https://card.weibo.com/article/v5/aj/editor/draft/create",
      saveUrl: "https://card.weibo.com/article/v5/aj/editor/draft/save",
    },
    {
      version: "v3",
      editorUrl: "https://card.weibo.com/article/v3/editor",
      createUrl: "https://card.weibo.com/article/v3/aj/editor/draft/create",
      saveUrl: "https://card.weibo.com/article/v3/aj/editor/draft/save",
    },
  ];

  async function getAccountId() {
    for (const endpoint of draftEndpoints) {
      try {
        const res = await fetch(endpoint.editorUrl);
        if (!res.ok) {
          console.debug(`${endpoint.version} editor request failed: ${res.status} ${res.statusText}`);
          continue;
        }

        const html = await res.text();
        const match = html.match(/\$CONFIG\['uid'\]\s*=\s*(\d+);/);
        if (match) return match[1];
      } catch (error) {
        console.debug(`${endpoint.version} editor request failed:`, error);
      }
    }
    return null;
  }

  const accountId = await getAccountId();

  // Crop an image to the required cover ratio.
  async function cropImage(fileInfo: FileData, ratio: number) {
    const canvas = document.createElement("canvas");

    const blob = await (await fetch(fileInfo.url)).blob();
    const file = new File([blob], fileInfo.name, { type: fileInfo.type });

    const base64Data = URL.createObjectURL(file);
    const img = new Image();

    img.src = base64Data;
    await new Promise((resolve) => {
      img.onload = () => {
        resolve(null);
      };
    });

    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;

    const width = img.width;
    const heightByRatio = img.width / ratio;

    if (heightByRatio > img.height) {
      const widthByHeight = img.height * ratio;
      const height = img.height;
      const offsetX = (img.width - widthByHeight) / 2;

      canvas.width = widthByHeight;
      canvas.height = height;
      ctx?.drawImage(img, offsetX, 0, widthByHeight, height, 0, 0, widthByHeight, height);
    } else {
      const offsetY = (img.height - heightByRatio) / 2;

      canvas.width = width;
      canvas.height = heightByRatio;
      ctx?.drawImage(img, 0, offsetY, width, heightByRatio, 0, 0, width, heightByRatio);
    }

    const croppedImageData = canvas.toDataURL(fileInfo.type);
    console.debug("croppedImageData", croppedImageData, "ratio", ratio);

    return { ...fileInfo, base64Data: croppedImageData };
  }

  // Upload an image to Weibo's shared picture API.
  async function uploadImage(fileInfo: FileData): Promise<{ pid: string; width: number; height: number } | null> {
    console.debug("uploadImage", fileInfo);

    const uploadUrl = new URL("https://picupload.weibo.com/interface/pic_upload.php");
    uploadUrl.searchParams.set("app", "miniblog");
    uploadUrl.searchParams.set("s", "json");
    uploadUrl.searchParams.set("p", "1");
    uploadUrl.searchParams.set("data", "1");
    uploadUrl.searchParams.set("url", "weibo.com/ww");
    uploadUrl.searchParams.set("markpos", "1");
    uploadUrl.searchParams.set("logo", "1");
    uploadUrl.searchParams.set("nick", "ww");
    uploadUrl.searchParams.set("file_source", "4");
    uploadUrl.searchParams.set("_rid", new Date().getTime().toString());

    const url = uploadUrl.toString();
    const blob = await (await fetch(fileInfo.url)).blob();

    try {
      const response = await fetch(url, {
        method: "POST",
        body: blob,
        credentials: "include",
      });

      if (!response.ok) throw Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      console.debug("Image upload result:", result);

      const pic = result?.data?.pics?.pic_1;
      if (pic?.pid) {
        return { pid: pic.pid, width: Number(pic.width) || 0, height: Number(pic.height) || 0 };
      }
      return null;
    } catch (error) {
      console.debug("Error uploading image:", error);
      return null;
    }
  }

  // Replace article inline images with uploaded Weibo image URLs.
  async function processContent(
    htmlContent: string,
    imageFiles: FileData[],
    updateTip: (msg: string) => void,
  ): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const images = doc.getElementsByTagName("img");

    console.debug("images", images);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      updateTip(`正在上传第 ${i + 1}/${images.length} 张图片`);

      const src = img.getAttribute("src");
      if (src) {
        console.debug("try replace ", src);
        const fileInfo = imageFiles.find((f) => f.url === src);

        if (fileInfo) {
          const uploaded = await uploadImage(fileInfo);
          if (uploaded) {
            const { pid, width, height } = uploaded;
            // Use Weibo's figure/srcset structure while keeping large as the fallback src.
            const figure = doc.createElement("figure");
            figure.className = "image";
            const newImg = doc.createElement("img");
            newImg.setAttribute("src", `https://wx2.sinaimg.cn/large/${pid}.jpg`);
            newImg.setAttribute("alt", "图片");
            newImg.setAttribute(
              "srcset",
              `https://wx2.sinaimg.cn/bmiddle/${pid}.jpg 440w, https://wx2.sinaimg.cn/mw690/${pid}.jpg 690w, https://wx2.sinaimg.cn/mw1024/${pid}.jpg 1024w, https://wx2.sinaimg.cn/large/${pid}.jpg 2048w`,
            );
            newImg.setAttribute("sizes", "100vw");
            if (width && height) {
              newImg.setAttribute("aspect", (width / height).toString());
              newImg.setAttribute("width", width.toString());
            }
            figure.appendChild(newImg);
            img.replaceWith(figure);
            console.debug("newUrl", `https://wx2.sinaimg.cn/large/${pid}.jpg`);
          }
        }
      }
    }
    console.debug("doc.body.innerHTML", doc.body.innerHTML);
    return doc.body.innerHTML;
  }

  function buildDraftFormData(
    endpoint: WeiboDraftEndpoint,
    processedData: ArticleData,
    coverUrl: string | null,
    draftId: string,
  ) {
    const formData = new FormData();

    formData.append("title", processedData.title?.slice(0, 32) || "");
    formData.append("type", "");
    formData.append("summary", processedData.digest?.slice(0, 44) || "");
    formData.append("writer", "");
    formData.append("cover", coverUrl || "");
    formData.append("content", processedData.htmlContent || "");
    formData.append("collection", JSON.stringify([]));
    formData.append("updated", new Date().toISOString());
    formData.append("id", draftId);
    formData.append("subtitle", "");
    formData.append("extra", "null");
    formData.append("status", "0");
    formData.append("publish_at", "");
    formData.append("error_msg", "");
    formData.append("error_code", "0");
    formData.append("free_content", "");
    formData.append("is_word", "0");
    formData.append("article_recommend", JSON.stringify({}));
    formData.append("publish_local_at", "");
    formData.append("timestamp", "");
    formData.append("is_article_free", "0");
    formData.append("only_render_h5", "0");
    formData.append("is_ai_plugins", "0");
    formData.append("is_aigc_used", "0");
    formData.append("is_v4", "0");
    formData.append("follow_to_read", "1");
    formData.append("follow_to_read_detail[result]", "1");
    formData.append("follow_to_read_detail[x]", "0");
    formData.append("follow_to_read_detail[y]", "0");
    formData.append("follow_to_read_detail[readme_link]", "http://t.cn/A6UnJsqW");
    formData.append("follow_to_read_detail[level]", "");
    formData.append("follow_to_read_detail[daily_limit]", "1");
    formData.append("follow_to_read_detail[daily_limit_notes]", "非认证用户单日仅限1篇文章使用");
    formData.append("follow_to_read_detail[show_level_tips]", "0");
    formData.append("isreward", "0");
    formData.append("isreward_tips", "");
    formData.append(
      "isreward_tips_url",
      `https://card.weibo.com/article/${endpoint.version}/aj/editor/draft/applyisrewardtips?uid=${accountId || ""}`,
    );
    formData.append("pay_setting", JSON.stringify([]));
    formData.append("source", "0");
    formData.append("action", "0");
    formData.append("is_single_pay_new", "");
    formData.append("money", "");
    formData.append("is_vclub_single_pay", "");
    formData.append("vclub_single_pay_money", "");
    formData.append("content_type", "0");
    formData.append("save", "1");
    formData.append("wbeditorRef", "9");
    formData.append("ver", "4.0");
    formData.append("_rid", new Date().getTime().toString());

    return formData;
  }

  async function requestDraftJson(url: string, init: RequestInit, label: string): Promise<DraftRequestResult> {
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        console.debug(`${label} failed: ${response.status} ${response.statusText}`);
        return { ok: false };
      }

      try {
        return { ok: true, json: await response.json() };
      } catch (error) {
        console.debug(`${label} returned non-JSON:`, error);
        return { ok: false };
      }
    } catch (error) {
      console.debug(`${label} failed:`, error);
      return { ok: false };
    }
  }

  async function createDraft(endpoint: WeiboDraftEndpoint): Promise<DraftRequestResult> {
    const createUrl = new URL(endpoint.createUrl);
    createUrl.searchParams.set("uid", accountId || "");
    createUrl.searchParams.set("_rid", new Date().getTime().toString());

    const createResult = await requestDraftJson(
      createUrl.toString(),
      {
        method: "POST",
        credentials: "include",
      },
      `${endpoint.version} draft create`,
    );

    if (!createResult.ok) {
      return createResult;
    }

    console.debug(`${endpoint.version} createResult`, createResult.json);
    const draftId = createResult.json?.data?.id;
    if (!draftId) {
      console.debug(`${endpoint.version} 草稿创建失败`, createResult.json?.msg);
      return { ok: false, json: createResult.json };
    }

    return { ok: true, json: createResult.json, id: String(draftId) };
  }

  async function saveDraft(
    endpoint: WeiboDraftEndpoint,
    processedData: ArticleData,
    coverUrl: string | null,
    draftId: string,
  ): Promise<DraftRequestResult> {
    const saveUrl = new URL(endpoint.saveUrl);
    saveUrl.searchParams.set("uid", accountId || "");
    saveUrl.searchParams.set("id", draftId);
    saveUrl.searchParams.set("_rid", new Date().getTime().toString());

    const formData = buildDraftFormData(endpoint, processedData, coverUrl, draftId);
    console.debug(`${endpoint.version} formData`, formData);

    const saveResult = await requestDraftJson(
      saveUrl.toString(),
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
      `${endpoint.version} draft save`,
    );

    if (!saveResult.ok) {
      return saveResult;
    }

    console.debug(`${endpoint.version} result`, saveResult.json);
    if (saveResult.json?.code === WEIBO_DRAFT_SUCCESS_CODE) {
      console.debug("草稿发布成功");
      return saveResult;
    }

    console.debug("草稿发布失败", saveResult.json?.msg);
    return { ok: false, json: saveResult.json };
  }

  async function saveDraftWithRetry(
    endpoint: WeiboDraftEndpoint,
    processedData: ArticleData,
    coverUrl: string | null,
    draftId: string,
  ) {
    const firstResult = await saveDraft(endpoint, processedData, coverUrl, draftId);
    if (firstResult.ok) return firstResult;

    console.debug(`${endpoint.version} draft save failed; retrying once on the same draft`);
    return await saveDraft(endpoint, processedData, coverUrl, draftId);
  }

  // Create and save a draft.
  async function createAndSaveDraft(
    processedData: ArticleData,
    coverUrl: string | null,
    updateTip: (msg: string) => void,
  ): Promise<string | null> {
    updateTip("正在创建草稿...");

    const [primaryEndpoint, fallbackEndpoint] = draftEndpoints;
    const primaryCreateResult = await createDraft(primaryEndpoint);
    if (primaryCreateResult.id) {
      const primarySaveResult = await saveDraftWithRetry(
        primaryEndpoint,
        processedData,
        coverUrl,
        primaryCreateResult.id,
      );
      if (primarySaveResult.ok) return primaryCreateResult.id;

      console.debug(
        `${primaryEndpoint.version} draft save failed after draft ${primaryCreateResult.id}; keeping that draft and skipping v3 fallback`,
      );
      updateTip(`草稿发布失败:${primarySaveResult.json?.msg || "草稿发布失败"}`);
      return null;
    }

    console.debug(`${primaryEndpoint.version} draft create failed; trying ${fallbackEndpoint.version} fallback`);

    const fallbackCreateResult = await createDraft(fallbackEndpoint);
    if (!fallbackCreateResult.id) {
      updateTip(`草稿发布失败:${fallbackCreateResult.json?.msg || "草稿创建失败"}`);
      return null;
    }

    const fallbackSaveResult = await saveDraft(fallbackEndpoint, processedData, coverUrl, fallbackCreateResult.id);
    if (fallbackSaveResult.ok) return fallbackCreateResult.id;

    updateTip(`草稿发布失败:${fallbackSaveResult.json?.msg || "草稿发布失败"}`);
    return null;
  }

  // Update the floating tip.
  function updateTip(message: string) {
    const tipElement = tip.querySelector(".float-tip") as HTMLDivElement;
    if (tipElement) {
      tipElement.textContent = message;
    }
  }

  function waitForElement<T extends Element>(
    selector: string,
    timeout = 15000,
    root: ParentNode = document,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const existing = root.querySelector<T>(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = root.querySelector<T>(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      const observationRoot = root instanceof Document ? root.documentElement : root;
      if (!observationRoot) {
        reject(new Error(`Cannot observe selector "${selector}" before the document root is ready`));
        return;
      }
      observer.observe(observationRoot, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  function setNativeInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const prototype =
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!setter) {
      throw new Error("未找到输入框原生 value setter");
    }
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getEnabledActionTarget(element: HTMLElement | null): HTMLElement | null {
    if (!element) return null;
    const target = element.closest<HTMLButtonElement>("button") || element;
    const disabled =
      (target instanceof HTMLButtonElement && target.disabled) ||
      target.getAttribute("aria-disabled") === "true" ||
      target.classList.contains("disabled") ||
      target.classList.contains("is-disabled");
    return disabled ? null : target;
  }

  function editorHasContent(editor: HTMLElement, previousHtml: string): boolean {
    return editor.innerHTML !== previousHtml && editor.innerHTML.trim().length > 0;
  }

  async function publishWithDomFallback(processedData: ArticleData): Promise<boolean> {
    try {
      let editorRoot = await waitForElement<HTMLElement>("div.WB_editor_box");

      const createLink = Array.from(editorRoot.querySelectorAll("a")).find((element) =>
        element.textContent?.includes("创作一篇新文章"),
      );
      if (createLink) {
        createLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const titleInput = await waitForElement<HTMLTextAreaElement>(
        'div.WB_editor_box textarea[placeholder="请输入标题"]',
      );
      editorRoot = titleInput.closest<HTMLElement>("div.WB_editor_box") || editorRoot;
      const editor = editorRoot.querySelector<HTMLElement>(
        '.ProseMirror[contenteditable="true"], .ql-editor[contenteditable="true"], [contenteditable="true"][role="textbox"], div[contenteditable="true"]',
      );
      if (!editor) return false;

      const expectedTitle = processedData.title?.slice(0, 32) || "";
      setNativeInputValue(titleInput, expectedTitle);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (titleInput.value !== expectedTitle) return false;

      editor.focus();
      const previousEditorHtml = editor.innerHTML;
      const expectedBody = processedData.htmlContent || processedData.markdownContent || processedData.digest || "";
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", processedData.htmlContent || "");
      clipboardData.setData("text/plain", processedData.markdownContent || processedData.digest || "");
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      editor.dispatchEvent(pasteEvent);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (expectedBody && !editorHasContent(editor, previousEditorHtml)) {
        return false;
      }

      if (processedData.cover) {
        editorRoot.querySelectorAll<HTMLElement>(".article-cover-delete").forEach((button) => button.click());
        const addCover = editorRoot.querySelector<HTMLElement>("div.article-cover-add");
        if (addCover) {
          addCover.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const uploadDialog = Array.from(
            document.querySelectorAll<HTMLElement>(
              '[role="dialog"]:not([aria-hidden="true"]), .byte-modal-wrapper:not([aria-hidden="true"])',
            ),
          ).find((dialog) =>
            Array.from(dialog.querySelectorAll<HTMLElement>("div.byte-tabs-header-title")).some((element) =>
              element.textContent?.includes("上传图片"),
            ),
          );
          const uploadTab = Array.from(
            uploadDialog?.querySelectorAll<HTMLElement>("div.byte-tabs-header-title") || [],
          ).find((element) => element.textContent?.includes("上传图片"));
          uploadTab?.click();
          await new Promise((resolve) => setTimeout(resolve, 500));

          const fileInput =
            uploadDialog?.querySelector<HTMLInputElement>('input[type="file"][accept*="image"]') ||
            document.querySelector<HTMLInputElement>(
              '.byte-modal-wrapper input[type="file"][accept*="image"], [role="dialog"] input[type="file"][accept*="image"]',
            );
          if (fileInput) {
            const blob = await (await fetch(processedData.cover.url)).blob();
            const coverFile = new File([blob], processedData.cover.name, {
              type: processedData.cover.type || blob.type,
            });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(coverFile);
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 3000));
            const confirmButton = getEnabledActionTarget(
              uploadDialog?.querySelector<HTMLElement>('button[data-e2e="imageUploadConfirm-btn"]') ||
                document.querySelector<HTMLElement>(
                  '[role="dialog"] button[data-e2e="imageUploadConfirm-btn"], .byte-modal-wrapper button[data-e2e="imageUploadConfirm-btn"]',
                ),
            );
            if (!confirmButton) return false;
            confirmButton.click();
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else if (data.isAutoPublish) {
            return false;
          }
        } else if (data.isAutoPublish) return false;
      }

      if (!data.isAutoPublish) {
        updateTip("内容已填入，请继续操作...");
        return true;
      }

      if (titleInput.value !== expectedTitle || !editorHasContent(editor, previousEditorHtml)) return false;

      const nextButton = getEnabledActionTarget(
        Array.from(editorRoot.querySelectorAll<HTMLElement>("span.next")).find((element) =>
          element.textContent?.includes("下一步"),
        ) || null,
      );
      if (!nextButton) return false;
      nextButton.click();
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const publishButton = getEnabledActionTarget(
        Array.from(document.querySelectorAll<HTMLButtonElement>("button.publish_dialog_publish")).find((element) =>
          element.textContent?.includes("发布"),
        ) || null,
      );
      if (!publishButton) return false;
      publishButton.click();
      return true;
    } catch (error) {
      console.debug("微博文章 DOM 兜底失败:", error);
      return false;
    }
  }

  // Main flow.
  const host = document.createElement("div") as HTMLDivElement;
  const tip = document.createElement("div") as HTMLDivElement;

  try {
    // Add a floating progress tip.
    host.style.position = "fixed";
    host.style.bottom = "20px";
    host.style.right = "20px";
    host.style.zIndex = "9999";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    tip.innerHTML = `
      <style>
        .float-tip {
          background: #1e293b;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      </style>
      <div class="float-tip">
        正在同步文章到微博图文...
      </div>
    `;
    shadow.appendChild(tip);

    // Publish flow.
    async function publishToWeibo() {
      try {
        // Upload and replace article inline images.
        articleData.htmlContent = await processContent(articleData.htmlContent, articleData.images || [], updateTip);

        if (data.isAutoPublish) {
          updateTip("正在填充页面并准备发布...");
          const published = await publishWithDomFallback(articleData);
          if (!published) console.error("微博文章自动发布失败");
          return published;
        }

        // Cover upload is optional; missing cover should not block draft creation.
        let coverUrl: string | null = null;
        if (articleData.cover) {
          updateTip("正在上传封面...");
          const croppedCover = await cropImage(articleData.cover, 16 / 9);
          const uploaded = await uploadImage(croppedCover);
          if (uploaded) {
            coverUrl = `https://wx2.sinaimg.cn/large/${uploaded.pid}.jpg`;
          } else {
            console.debug("封面上传失败");
          }
        }

        // Create and save a draft with or without a cover.
        const draftId = await createAndSaveDraft(articleData, coverUrl, updateTip);

        if (draftId) {
          updateTip("草稿发布成功，请预览...");

          const draftUrl = draftEndpoints[0].editorUrl;
          console.debug("draftUrl", draftUrl);
          window.location.href = draftUrl;
          return true;
        }

        updateTip("接口创建草稿失败，正在尝试页面填充...");
        const fallbackSucceeded = await publishWithDomFallback(articleData);
        if (!fallbackSucceeded) {
          updateTip("草稿创建失败，请手动操作");
          console.error("微博文章页面填充失败");
        }
        return fallbackSucceeded;
      } catch (error) {
        console.error("发布文章失败:", error);
        return false;
      }
    }

    await publishToWeibo();

    // Remove the tip after 3 seconds.
    setTimeout(() => {
      if (document.body.contains(host)) {
        document.body.removeChild(host);
      }
    }, 3000);
  } catch (error) {
    if (document.body.contains(host)) {
      const floatTip = tip.querySelector(".float-tip") as HTMLDivElement;
      floatTip.textContent = "同步失败，请重试";
      floatTip.style.backgroundColor = "#dc2626";

      setTimeout(() => {
        document.body.removeChild(host);
      }, 3000);
    }

    console.error("发布文章失败:", error);
  }
}
