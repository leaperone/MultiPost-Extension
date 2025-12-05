import type { AccountInfo } from "../common";

/**
 * 获取得物账户信息
 */
export async function getDewuAccountInfo(): Promise<AccountInfo | null> {
  try {
    // 访问得物API获取用户信息
    const response = await fetch("https://creator.dewu.com/api/user/info", {
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
    if (!responseData.success || !responseData.data) {
      console.warn("未检测到得物登录状态");
      return null;
    }

    const userInfo = responseData.data;
    const result: AccountInfo = {
      provider: "dewu",
      accountId: userInfo.userId || userInfo.id || "unknown",
      username: userInfo.nickname || userInfo.name || userInfo.username || "得物用户",
      description: userInfo.bio || userInfo.description || "",
      profileUrl: "https://creator.dewu.com/",
      avatarUrl: userInfo.avatar || userInfo.headImg || userInfo.profilePicture || "",
      extraData: null,
    };

    return result;
  } catch (error) {
    console.error("获取得物账户信息失败:", error);

    // 如果API调用失败，尝试从页面获取基本信息
    try {
      const usernameElement = document.querySelector('.user-name, .nickname, .username, [class*="name"]');
      const avatarElement = document.querySelector('.avatar img, .user-avatar img, [class*="avatar"] img');

      if (usernameElement) {
        const result: AccountInfo = {
          provider: "dewu",
          accountId: "unknown",
          username: usernameElement.textContent || "得物用户",
          description: "",
          profileUrl: "https://creator.dewu.com/",
          avatarUrl: avatarElement ? (avatarElement as HTMLImageElement).src : "",
          extraData: null,
        };
        return result;
      }
    } catch (pageError) {
      console.error("从页面获取得物信息也失败:", pageError);
    }

    return null;
  }
}
