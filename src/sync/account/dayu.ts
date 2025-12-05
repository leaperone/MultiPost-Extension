import type { AccountInfo } from "../common";

/**
 * 获取大鱼号账户信息
 */
export async function getDayuAccountInfo(): Promise<AccountInfo | null> {
  try {
    // 访问大鱼号API获取用户信息
    const response = await fetch("https://mp.dayu.com/api/user/info", {
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
      console.warn("未检测到大鱼号登录状态");
      return null;
    }

    const userInfo = responseData.data;
    const result: AccountInfo = {
      provider: "dayu",
      accountId: userInfo.userId || userInfo.id || "unknown",
      username: userInfo.nickname || userInfo.name || userInfo.username || "大鱼号用户",
      description: userInfo.bio || userInfo.description || "",
      profileUrl: "https://mp.dayu.com/",
      avatarUrl: userInfo.avatar || userInfo.headImg || userInfo.profilePicture || "",
      extraData: null,
    };

    return result;
  } catch (error) {
    console.error("获取大鱼号账户信息失败:", error);

    // 如果API调用失败，尝试从页面获取基本信息
    try {
      const usernameElement = document.querySelector('.user-name, .nickname, .username, [class*="name"]');
      const avatarElement = document.querySelector('.avatar img, .user-avatar img, [class*="avatar"] img');

      if (usernameElement) {
        const result: AccountInfo = {
          provider: "dayu",
          accountId: "unknown",
          username: usernameElement.textContent || "大鱼号用户",
          description: "",
          profileUrl: "https://mp.dayu.com/",
          avatarUrl: avatarElement ? (avatarElement as HTMLImageElement).src : "",
          extraData: null,
        };
        return result;
      }
    } catch (pageError) {
      console.error("从页面获取大鱼号信息也失败:", pageError);
    }

    return null;
  }
}
