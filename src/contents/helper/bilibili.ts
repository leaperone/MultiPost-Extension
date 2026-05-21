import { createdInputs } from "~contents/helper";
import { registerBridgeHandler } from "./bridge";
import { waitForElement } from "./common";

let isProcessingImage = false;

/**
 * 旧版图片上传：通过 BILIBILI_DYNAMIC_UPLOAD_IMAGES 触发。
 * 新代码请用 MP_BRIDGE action "bilibili.uploadDynamicImages"。
 */
export async function handleBilibiliImageUpload(event: MessageEvent) {
  if (isProcessingImage) {
    return;
  }
  isProcessingImage = true;
  const files = event.data.files;

  await waitForElement(".bili-dyn-publishing__image-upload");

  const uploadInput = createdInputs.find((input) => input.type === "file" && input.name === "upload");
  if (!uploadInput) {
    return;
  }

  const dataTransfer = new DataTransfer();
  files.forEach((file: File) => dataTransfer.items.add(file));
  uploadInput.files = dataTransfer.files;

  const addButton = document.querySelector(".bili-pics-uploader__add");

  uploadInput.disabled = true;
  addButton?.dispatchEvent(new Event("click", { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 1000));

  uploadInput.disabled = false;
  uploadInput.dispatchEvent(new Event("change", { bubbles: true }));

  isProcessingImage = false;
}

interface BiliUploadResult {
  imageUrl: string;
  width?: number;
  height?: number;
  size?: number;
}

/**
 * 从 cookie 中读取指定字段。
 * B 站身份依赖 bili_jct（CSRF）+ buvid3，需要用户已经在站点登录。
 */
function readCookie(name: string): string {
  const segment = document.cookie.split(";").find((c) => c.trim().startsWith(`${name}=`));
  if (!segment) return "";
  return segment.trim().slice(name.length + 1);
}

interface SerializableFile {
  name: string;
  type: string;
  data: ArrayBuffer;
}

/**
 * MAIN world 内调用 B 站官方动态图床 API 直传。
 * 走 main world 是因为 isolated world 的 fetch 不能携带 first-party cookie 到
 * api.bilibili.com（跨域 + credentials），main world 等同站点脚本，可以直接用。
 */
async function uploadDynamicImage(file: SerializableFile): Promise<BiliUploadResult> {
  const csrf = readCookie("bili_jct");
  if (!csrf) throw new Error("缺少 bili_jct，请确认已登录 B 站");

  const blob = new Blob([file.data], { type: file.type });
  const form = new FormData();
  form.append("file_up", blob, file.name);
  form.append("biz", "new_dyn");
  form.append("category", "daily");
  form.append("csrf", csrf);

  const resp = await fetch("https://api.bilibili.com/x/dynamic/feed/draw/upload_bfs", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status} from upload_bfs`);
  const json = (await resp.json()) as {
    code: number;
    message?: string;
    data?: { image_url?: string; img_width?: number; img_height?: number; img_size?: number };
  };
  if (json.code !== 0 || !json.data?.image_url) {
    throw new Error(json.message || `upload_bfs failed code=${json.code}`);
  }
  return {
    imageUrl: json.data.image_url,
    width: json.data.img_width,
    height: json.data.img_height,
    size: json.data.img_size,
  };
}

interface UploadImagesPayload {
  files: SerializableFile[];
}

/**
 * 注册 B 站相关的 MP_BRIDGE handlers。
 */
export function registerBilibiliBridgeHandlers(): void {
  registerBridgeHandler<UploadImagesPayload, BiliUploadResult[]>("bilibili.uploadDynamicImages", async (payload) => {
    const results: BiliUploadResult[] = [];
    for (const file of payload.files) {
      const r = await uploadDynamicImage(file);
      results.push(r);
    }
    return results;
  });
}
