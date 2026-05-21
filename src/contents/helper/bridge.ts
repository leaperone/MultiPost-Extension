/**
 * MP_BRIDGE — MAIN world 侧调度器。
 *
 * 在 src/contents/helper.ts 启动时被加载（PlasmoCSConfig 声明 world: "MAIN"）。
 * 提供 registerBridgeHandler(action, fn) 让各平台注册各自的处理逻辑，
 * 收到 MP_BRIDGE_REQUEST 时按 action 路由，处理完发 MP_BRIDGE_RESPONSE 带回执。
 */

export type BridgeHandler<P = unknown, R = unknown> = (payload: P) => Promise<R> | R;

const handlers = new Map<string, BridgeHandler>();
let installed = false;

export function registerBridgeHandler<P = unknown, R = unknown>(action: string, handler: BridgeHandler<P, R>): void {
  if (handlers.has(action)) {
    console.warn(`[MP_BRIDGE] overriding handler for "${action}"`);
  }
  handlers.set(action, handler as BridgeHandler);
}

export function installBridge(): void {
  if (installed) return;
  installed = true;

  window.addEventListener("message", async (event: MessageEvent) => {
    const msg = event.data;
    if (!msg || msg.type !== "MP_BRIDGE_REQUEST" || typeof msg.reqId !== "string") return;

    const { reqId, action, payload } = msg as { reqId: string; action: string; payload: unknown };
    const handler = handlers.get(action);

    if (!handler) {
      window.postMessage(
        {
          type: "MP_BRIDGE_RESPONSE",
          reqId,
          ok: false,
          error: `no handler registered for action "${action}"`,
        },
        "*",
      );
      return;
    }

    try {
      const data = await handler(payload);
      window.postMessage({ type: "MP_BRIDGE_RESPONSE", reqId, ok: true, data }, "*");
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      window.postMessage({ type: "MP_BRIDGE_RESPONSE", reqId, ok: false, error }, "*");
    }
  });
}
