# 贡献指南

<div align="center">

![GitHub License GitHub许可证](https://img.shields.io/github/license/leaper-one/MultiPost-Extension) ![GitHub Repo stars GitHub星星](https://img.shields.io/github/stars/leaper-one/MultiPost-Extension) ![GitHub commit activity GitHub提交活动](https://img.shields.io/github/commit-activity/m/leaper-one/MultiPost-Extension)

</div>

欢迎来到 MultiPost-Extension 项目！👋

非常感谢你对 MultiPost 感兴趣！这是一个帮助用户一键将内容发布到多个社交媒体平台的浏览器扩展。无论你是开发者、内容创作者，还是对项目感兴趣的用户，我们都非常欢迎你的参与和贡献。

### 关于 MultiPost

MultiPost 是一个强大的跨平台内容发布工具，主要特点包括：

- 支持同步发布到知乎、微博、小红书、抖音等 10+ 主流平台
- 无需登录、无需注册、无需 API Key，完全免费
- 支持文本、图片、视频等多种内容类型
- 支持网页集成，可以开发自己的网页并利用扩展的发布功能进行自动化

### 为什么贡献很重要？

每一个贡献都对项目的发展至关重要。你可以通过多种方式参与：
- 🐛 报告 bug
- 💡 提出新功能建议
- 📝 改进文档
- 🌍 帮助翻译
- 💻 提交代码
- 🤝 参与社区讨论

无论是修复错误、改进文档还是提出新功能，我们都会认真对待每一个贡献。本指南将帮助你了解如何参与项目开发。

## 目录

- [贡献指南](#贡献指南)
    - [关于 MultiPost](#关于-multipost)
    - [为什么贡献很重要？](#为什么贡献很重要)
  - [目录](#目录)
  - [行为准则](#行为准则)
  - [如何贡献](#如何贡献)
    - [报告问题 (Issues)](#报告问题-issues)
    - [提交代码 (Pull Requests)](#提交代码-pull-requests)
    - [改进文档](#改进文档)
  - [重要文档](#重要文档)
    - [项目架构](#项目架构)
  - [开发环境设置](#开发环境设置)
  - [提交规范](#提交规范)
  - [代码规范](#代码规范)
  - [平台适配贡献](#平台适配贡献)
    - [适配要求](#适配要求)
  - [沟通渠道](#沟通渠道)
  - [许可证](#许可证)

## 行为准则

本项目采用贡献者契约行为准则。我们希望所有参与者都能遵守这些准则，共同创建一个友好、包容的社区环境。我们的目标是建立一个积极、包容和互助的社区，欢迎来自不同背景的贡献者参与。

## 如何贡献

### 报告问题 (Issues)

如果你发现了 bug 或有新功能建议，请通过 GitHub Issues 提交。提交 issue 时，请：

1. 使用清晰的标题描述问题
2. 详细描述问题或建议
3. 如果是 bug，请提供：
   - 复现步骤
   - 预期行为
   - 实际行为
   - 浏览器版本和操作系统信息
   - 相关的错误信息或截图

### 提交代码 (Pull Requests)

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的修改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

### 改进文档

文档同样重要！你可以：
- 修正文档中的错误
- 添加缺失的内容
- 改进现有文档的清晰度
- 帮助翻译文档

## 重要文档

在开始贡献之前，请先阅读以下重要文档：

1. [如何开始开发](docs/1-how-to-start-devlopment.md) - 包含：
   - 开发环境搭建
   - 构建说明
   - 项目架构介绍
   - 推荐学习资源

2. [使用扩展程序发布内容](docs/2-use-extension-to-publish.md) - 包含：
   - 扩展程序工作原理
   - API 接口文档
   - 通信协议说明
   - 示例代码

3. 官方文档：
   - [Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/api)
   - [Edge Extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)
   - [Plasmo Docs](https://docs.plasmo.com/)

### 项目架构

项目的主要目录结构：

```
src/
├── sync/      # 不同平台的操作代码
│   ├── dynamic/   # 动态发布相关
│   ├── video/     # 视频发布相关
│   └── common.ts  # 平台注册配置
└── components/    # 前端界面组件
```

## 开发环境设置

1. 确保你的开发环境满足以下要求：
   - Node.js >= 16
   - pnpm 包管理器

2. 克隆仓库并安装依赖：
   ```bash
   git clone https://github.com/your-username/MultiPost-Extension.git
   cd MultiPost-Extension
   pnpm install
   ```

3. 启动开发服务器：
   ```bash
   pnpm dev
   ```

4. 在 Chrome 浏览器中加载扩展：
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，提交信息格式如下：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型（type）必须是以下之一：
- feat: 新功能
- fix: 修复 bug
- docs: 文档更新
- style: 代码格式修改
- refactor: 代码重构
- perf: 性能优化
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 代码规范

- 使用 TypeScript 编写代码
- 遵循项目现有的代码风格
- 确保代码通过 ESLint 检查
- 为新功能编写测试
- 保持代码简洁，遵循 DRY 原则
- 添加必要的注释，解释复杂的逻辑

## 平台适配贡献

我们非常欢迎社区成员为 MultiPost 添加新的平台支持！如果你想要适配新的平台，请：

1. 在 `src/sync/dynamic` 或 `src/sync/video` 目录下创建新的平台实现文件
2. 在文件头部添加你的署名信息：
```typescript
/**
 * @file 平台名称动态发布实现
 * @author 你的名字 <你的邮箱/GitHub>
 * @date YYYY-MM-DD
 */
```
3. 遵循现有平台的实现模式
4. 在 `src/sync/common.ts` 中注册新平台
5. 编写必要的文档和测试

### 适配要求

1. 基本功能
   - 支持文本内容发布
   - 支持图片上传（如果平台支持）
   - 支持自动/手动发布模式

2. 文档要求
   - 在代码中添加必要的注释
   - 更新平台支持列表
   - 添加使用说明（如果有特殊要求）

## 沟通渠道

- GitHub Issues: 问题报告和功能请求
- GitHub Discussions: 一般讨论和问题
- Pull Requests: 代码相关讨论

## 许可证

通过提交 pull request，你同意你的贡献将按照项目的开源许可证进行授权。

---

再次感谢你的贡献！如果你有任何问题，随时可以通过以下渠道与我们联系：

- QQ 群：[921137242](http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=c5BjhD8JxNAuwjKh6qvCoROU301PppYU&authKey=NfKianfDwngrwJyVQbefIQET9vUQs46xb0PfOYUm6KzdeCjPd5YbvlRoO8trJUUZ&noverify=0&group_code=921137242)
- 邮箱：support@leaper.one
- Twitter：[@harry_wong_](https://x.com/harry_wong_)
- GitHub Issues：https://github.com/MultiPost-Extension/MultiPost-Extension/issues 