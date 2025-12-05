import type { AccountInfo } from "../common";

/**
 * 获取车家号账户信息
 */
export async function getChejiahaoAccountInfo(): Promise<AccountInfo | null> {
  try {
    // 访问车家号API获取用户信息
    const response = await fetch("https://creator.autohome.com.cn/author/api/getAuthorInfo", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include", // 包含cookie以确保认证
    });

    if (!response.ok) {
      throw new Error(`HTTP错误，状态码: ${response.status}`);
    }

    const responseData = await response.json();

    // 检查是否登录
    if (!responseData.result || !responseData.result.authorId) {
      console.warn("未检测到车家号登录状态");
      return null;
    }

    const authorInfo = responseData.result;
    const result: AccountInfo = {
      provider: "chejiahao",
      accountId: authorInfo.authorId,
      username: authorInfo.name || authorInfo.authorName || "车家号用户",
      description: authorInfo.description || "",
      profileUrl: "https://creator.autohome.com.cn/",
      avatarUrl: authorInfo.avatar || authorInfo.headImg || "",
      extraData: null,
    };

    return result;
  } catch (error) {
    console.error("获取车家号账户信息失败:", error);

    // 如果API调用失败，尝试从页面获取基本信息
    try {
      const usernameElement = document.querySelector('.user-name, .author-name, .username, [class*="name"]');
      const avatarElement = document.querySelector('.avatar img, .user-avatar img, [class*="avatar"] img');

      if (usernameElement) {
        const result: AccountInfo = {
          provider: "chejiahao",
          accountId: "unknown",
          username: usernameElement.textContent || "车家号用户",
          description: "",
          profileUrl: "https://creator.autohome.com.cn/",
          avatarUrl: avatarElement ? (avatarElement as HTMLImageElement).src : "",
          extraData: null,
        };
        return result;
      }
    } catch (pageError) {
      console.error("从页面获取车家号信息也失败:", pageError);
    }

    return null;
  }
}
