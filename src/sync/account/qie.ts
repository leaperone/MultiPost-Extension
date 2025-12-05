import type { AccountInfo } from "~sync/common";

export async function getQiEAccountInfo(): Promise<AccountInfo> {
  try {
    // 访问企鹅号API获取用户信息
    const response = await fetch("https://om.qq.com/user/auth/info", {
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
    if (!responseData.data || !responseData.data.userId) {
      return null;
    }

    const result: AccountInfo = {
      provider: "qie",
      accountId: responseData.data.userId,
      username: responseData.data.nickName || responseData.data.name,
      description: responseData.data.desc || "",
      profileUrl: "https://om.qq.com/",
      avatarUrl: responseData.data.headImg || responseData.data.avatar,
      extraData: responseData,
    };

    return result;
  } catch (error) {
    console.error("获取企鹅号账户信息失败:", error);

    // 如果API调用失败，尝试从页面获取基本信息
    try {
      const usernameElement = document.querySelector('.user-name, .nickname, [class*="username"]');
      const avatarElement = document.querySelector('.user-avatar, .avatar img, [class*="avatar"] img');

      if (usernameElement) {
        const result: AccountInfo = {
          provider: "qie",
          accountId: "unknown",
          username: usernameElement.textContent || "企鹅号用户",
          description: "",
          profileUrl: "https://om.qq.com/",
          avatarUrl: avatarElement ? (avatarElement as HTMLImageElement).src : "",
          extraData: null,
        };
        return result;
      }
    } catch (pageError) {
      console.error("从页面获取企鹅号信息也失败:", pageError);
    }

    return null;
  }
}
