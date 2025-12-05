import type { AccountInfo } from "../common";

/**
 * 获取网易号账户信息
 */
export async function getNeteaseAccountInfo(): Promise<AccountInfo | null> {
  try {
    // 访问网易号API获取用户信息
    const response = await fetch("https://dy.163.com/v2/user/info", {
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
      console.warn("未检测到网易号登录状态");
      return null;
    }

    const userInfo = responseData.data;
    const result: AccountInfo = {
      provider: "netease",
      accountId: userInfo.userId || userInfo.id || "unknown",
      username: userInfo.nickname || userInfo.name || userInfo.username || "网易号用户",
      description: userInfo.bio || userInfo.description || "",
      profileUrl: "https://dy.163.com/",
      avatarUrl: userInfo.avatar || userInfo.headImg || userInfo.profilePicture || "",
      extraData: null,
    };

    return result;
  } catch (error) {
    console.error("获取网易号账户信息失败:", error);

    // 如果API调用失败，尝试从页面获取基本信息
    try {
      const usernameElement = document.querySelector('.user-name, .nickname, .username, [class*="name"]');
      const avatarElement = document.querySelector('.avatar img, .user-avatar img, [class*="avatar"] img');

      if (usernameElement) {
        const result: AccountInfo = {
          provider: "netease",
          accountId: "unknown",
          username: usernameElement.textContent || "网易号用户",
          description: "",
          profileUrl: "https://dy.163.com/",
          avatarUrl: avatarElement ? (avatarElement as HTMLImageElement).src : "",
          extraData: null,
        };
        return result;
      }
    } catch (pageError) {
      console.error("从页面获取网易号信息也失败:", pageError);
    }

    return null;
  }
}
