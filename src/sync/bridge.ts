/**
 * MP_BRIDGE — isolated-world ↔ MAIN-world 统一消息桥。
 *
 * Publisher 通过 ISOLATED world 被注入（chrome.scripting.executeScript），
 * 无法 import 外部模块，但可以通过 window.postMessage 把"复杂事项"委托给
 * 同源页面里常驻的 MAIN-world content script（src/contents/helper.ts）。
 *
 * 旧实现散落着 BILIBILI_DYNAMIC_UPLOAD_IMAGES / BLUESKY_* 等私有消息类型，
 * 没有 reqId、没有回执、没有超时。本模块提供统一协议，新平台一律用这套。
 *
 * 本文件本身**不能**被 publisher 的 injectFunction 内部 import —— 因为
 * injectFunction 是序列化注入的，闭包外的模块解析不会被带过去。要在
 * publisher 里用，请把 sendBridge 的实现**整段拷进 injectFunction 闭包**。
 * 这里集中维护，是保证多个 publisher 拷贝出去的逻辑一致。
 */

export interface BridgeRequestMessage<P = unknown> {
  type: "MP_BRIDGE_REQUEST";
  reqId: string;
  action: string; // e.g. "bilibili.uploadImages"
  payload: P;
}

export interface BridgeResponseMessage<R = unknown> {
  type: "MP_BRIDGE_RESPONSE";
  reqId: string;
  ok: boolean;
  data?: R;
  error?: string;
}

export interface SendBridgeOptions {
  timeoutMs?: number;
}

/**
 * Publisher 侧调用：发起请求，等待 MAIN world 处理回执。
 * 在 injectFunction 中使用时请把整个函数体拷贝进去（不要 import 本模块）。
 */
export async function sendBridge<P = unknown, R = unknown>(
  action: string,
  payload: P,
  options: SendBridgeOptions = {},
): Promise<R> {
  const timeoutMs = options.timeoutMs ?? 30000;
  const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return new Promise<R>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as BridgeResponseMessage<R> | undefined;
      if (!msg || msg.type !== "MP_BRIDGE_RESPONSE" || msg.reqId !== reqId) return;
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      if (msg.ok) {
        resolve(msg.data as R);
      } else {
        reject(new Error(msg.error || `bridge action "${action}" failed`));
      }
    };

    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error(`bridge action "${action}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    window.addEventListener("message", onMessage);

    const req: BridgeRequestMessage<P> = {
      type: "MP_BRIDGE_REQUEST",
      reqId,
      action,
      payload,
    };
    window.postMessage(req, "*");
  });
}
