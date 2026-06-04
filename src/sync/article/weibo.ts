/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ArticleData, FileData, SyncData } from "~sync/common";

interface WeiboDraftEndpoint {
  version: string;
  createUrl: string;
  saveUrl: string;
}

interface DraftRequestResult {
  ok: boolean;
  json?: any;
  id?: string;
}

const WEIBO_DRAFT_SUCCESS_CODE = 100000;
const WEIBO_V3_EDITOR_URL = "https://card.weibo.com/article/v3/editor";

export async function ArticleWeibo(data: SyncData) {
  const articleData = data.data as ArticleData;
  const draftEndpoints: WeiboDraftEndpoint[] = [
    {
      version: "v5",
      createUrl: "https://card.weibo.com/article/v5/aj/editor/draft/create",
      saveUrl: "https://card.weibo.com/article/v5/aj/editor/draft/save",
    },
    {
      version: "v3",
      createUrl: "https://card.weibo.com/article/v3/aj/editor/draft/create",
      saveUrl: "https://card.weibo.com/article/v3/aj/editor/draft/save",
    },
  ];

  async function getAccountId() {
    try {
      const res = await fetch(WEIBO_V3_EDITOR_URL);
      if (!res.ok) {
        console.debug(`v3 editor request failed: ${res.status} ${res.statusText}`);
        return null;
      }

      const html = await res.text();
      const match = html.match(/\$CONFIG\['uid'\]\s*=\s*(\d+);/);
      return match ? match[1] : null;
    } catch (error) {
      console.debug("v3 editor request failed:", error);
      return null;
    }
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

  function buildDraftFormData(processedData: ArticleData, coverUrl: string | null, draftId: string) {
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
      `https://card.weibo.com/article/v3/aj/editor/draft/applyisrewardtips?uid${accountId}`,
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

    const formData = buildDraftFormData(processedData, coverUrl, draftId);
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

          if (!data.isAutoPublish) {
            const draftUrl = "https://card.weibo.com/article/v3/editor";
            console.debug("draftUrl", draftUrl);
            window.location.href = draftUrl;
          }
          return true;
        }

        // TODO: Add the DOM fallback publish path after live verification.
        updateTip("草稿创建失败，请手动操作");
        return false;
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
