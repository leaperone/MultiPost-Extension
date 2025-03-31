import type { AccountInfo } from "~sync/common";

export async function getRednoteAccountInfo(): Promise<AccountInfo> {
  // 直接使用fetch API获取小红书页面HTML
  const response = await fetch('https://www.xiaohongshu.com/explore');

  if (!response.ok) {
    throw new Error(`HTTP错误，状态码: ${response.status}`);
  }

  const htmlText = await response.text();

  // 根据调试输出，更精确地定位__INITIAL_STATE__的格式
  let initialStateMatch = htmlText.match(/window\.__INITIAL_STATE__=(\{.+?\})(?:<\/script>|;)/s);

  if (!initialStateMatch || !initialStateMatch[1]) {
    // 尝试不带脚本标签结束的模式
    initialStateMatch = htmlText.match(/window\.__INITIAL_STATE__=(\{.+?\})(;|\s|<)/s);
  }

  if (!initialStateMatch || !initialStateMatch[1]) {
    // 尝试最宽松的模式
    initialStateMatch = htmlText.match(/window\.__INITIAL_STATE__=(\{.+)/s);
    if (initialStateMatch && initialStateMatch[1]) {
      // 如果找到了开始但没有明确的结束，尝试手动寻找JSON的结束位置
      let jsonStr = initialStateMatch[1];
      // 尝试找到JSON对象的结束括号
      let openBraces = 1; // 已经有一个开始的'{'
      let closingIndex = -1;

      for (let i = 1; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') openBraces++;
        if (jsonStr[i] === '}') openBraces--;

        if (openBraces === 0) {
          closingIndex = i;
          break;
        }
      }

      if (closingIndex !== -1) {
        jsonStr = jsonStr.substring(0, closingIndex + 1);
        initialStateMatch[1] = jsonStr;
      }
    }
  }

  if (!initialStateMatch || !initialStateMatch[1]) {
    throw new Error('无法找到 __INITIAL_STATE__ 数据');
  }

  // 尝试在解析前清理JSON字符串
  let jsonStr = initialStateMatch[1];

  // 尝试处理可能的特殊字符或格式问题
  // 1. 确保JSON字符串正确开始和结束
  if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
    // 确保以{开始
    if (!jsonStr.startsWith('{')) {
      const startIndex = jsonStr.indexOf('{');
      if (startIndex > 0) {
        jsonStr = jsonStr.substring(startIndex);
      }
    }

    // 确保以}结束
    if (!jsonStr.endsWith('}')) {
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace > 0) {
        jsonStr = jsonStr.substring(0, lastBrace + 1);
      }
    }
  }

  // 2. 处理可能的意外字符
  // 替换控制字符
  jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // 3. 替换JSON中不合法的undefined值为null
  jsonStr = jsonStr.replace(/:undefined,/g, ':null,');
  jsonStr = jsonStr.replace(/:undefined}/g, ':null}');

  // 4. 尝试解析JSON
  let initialState;
  try {
    // 尝试直接解析
    initialState = JSON.parse(jsonStr);
  } catch {
    // 尝试更保守的方式，逐步替换可能的问题
    // 1. 再次尝试替换所有可能的undefined值为null
    jsonStr = jsonStr.replace(/undefined/g, 'null');

    try {
      initialState = JSON.parse(jsonStr);
    } catch {
      // 2. 尝试手动构建最简单的对象
      initialState = { manuallyParsed: true };

      // 尝试提取一些关键字段
      try {
        const userMatch = jsonStr.match(/"user"\s*:\s*(\{.+?\}),\s*"/);
        if (userMatch && userMatch[1]) {
          try {
            const userJson = userMatch[1].replace(/undefined/g, 'null');
            initialState.user = JSON.parse(userJson);
          } catch {
            // 提取user字段失败，忽略
          }
        }
      } catch {
        // 提取关键字段失败，忽略
      }

      throw new Error('解析 __INITIAL_STATE__ 数据失败，返回部分数据');
    }
  }

  if (!initialState.user.loggedIn) {
    return null;
  }

  const result: AccountInfo = {
    provider: 'rednote',
    accountId: initialState.user.userInfo.user_id,
    username: initialState.user.userInfo.nickname,
    description: initialState.user.userInfo.desc,
    profileUrl: `https://www.xiaohongshu.com/user/profile/${initialState.user.userInfo.user_id}`,
    avatarUrl: initialState.user.userInfo.images,
    extraData: initialState,
  }

  return result;
}
