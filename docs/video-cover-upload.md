# 四平台视频封面修复说明

基于 `main` 的 `5522ca01100a58572de3a652aebd7851f5fa648a`（1.5.1）。本次只调整 B 站、抖音、小红书和视频号上传函数中的封面操作；视频上传、标题正文、原创声明、定时和 `isAutoPublish` 的既有逻辑保留。

## 问题与改动

| 平台 | 旧路径的问题 | 本次处理 |
| --- | --- | --- |
| B 站 | 单封面操作无法覆盖当前双比例编辑器，控件与裁剪画布需要等待 | 分别处理 4:3 主封面和 16:9 空间封面，复核当前裁剪像素，保存后重开检查两槽 |
| 抖音 | 按视频比例选择一张图，无法可靠完成双封面；编辑器会替换文件输入并暂时卸载播放器 | 在同一编辑器内设置 4:3 横版和 3:4 竖版封面，每次重新定位有效图片输入，避开 AI/替换视频入口，保存后恢复视频预览并检查原视频 |
| 小红书 | 临时缺少画布或仅点击内部文字会造成过早操作 | 等待选中封面的画布，定位真正可用的父按钮，上传后复核画布和保存状态；不限制调用方必须提供 4:3 图片 |
| 视频号 | 新旧编辑器并存，首个图片输入可能属于隐藏旧弹窗或其他封面槽 | 等待当前可见编辑器与“直接编辑”入口，分别定位 3:4 视频封面和 4:3 分享封面输入，保存后复核图片预览 |

封面辅助函数保留在各平台函数内部，适配 `chrome.scripting.executeScript({ func })` 的函数序列化。`cover-types.ts` 只提供类型，四个平台使用 `import type`，没有新增运行时闭包依赖。

## 字段兼容

没有把 `cover`、`horizontalCover`、`verticalCover` 或 `FileData.type` 改成必填，也不要求调用方提供 SHA、账号或本地服务地址。

| 平台槽位 | 图片选择顺序 |
| --- | --- |
| B 站 4:3 | `cover` → `horizontalCover` |
| B 站 16:9 | `horizontalCover` → `cover` |
| 抖音 4:3 | `cover` → `horizontalCover` → `verticalCover` |
| 抖音 3:4 | `verticalCover` → `cover` → `horizontalCover` |
| 小红书 | `cover`，不锁定输入图片比例 |
| 视频号 3:4 | `verticalCover` → `cover` |
| 视频号 4:3 | `cover` → `horizontalCover` |

缺少可用图片的槽位跳过。单图可由平台裁剪为多个目标比例。图片读取优先采用响应中的有效 `image/*` MIME，否则采用调用方的有效图片 MIME，并通过图片解码检查内容。HTTP 失败会在修改图片输入前停止。

封面流程记录 `saved`、`failed`、`needs_attention` 或 `skipped` 供日志定位；不改变平台函数的公开返回接口。`saved` 表示封面编辑器保存检查通过，不表示内容已经发布。

## 验证与边界

使用现有锁定依赖，未新增或升级依赖、未修改锁文件。验证环境为 Windows / Node 24.18.0 / pnpm 10.34.8。

```sh
pnpm test:video-covers
pnpm typecheck
pnpm exec biome check biome.json package.json src/sync/video/bilibili.ts src/sync/video/douyin.ts src/sync/video/rednote.ts src/sync/video/weixinchannel.ts src/sync/video/cover-types.ts tests/video-covers.test.mjs tests/video-cover-fixtures.mjs
pnpm exec biome lint src
pnpm dev
pnpm build
```

- 11 项自动回归通过。测试从 TypeScript 中提取封面函数，转译并在独立 VM 中执行，覆盖双槽保存、保存后像素不符、播放器暂时卸载/变化、输入重建、禁用或歧义控件、错误页面模式、跨槽覆盖、可选字段、MIME 回退、HTTP 失败及小红书非 4:3 图片。
- 类型检查、改动文件的 Biome 检查、`biome lint src`、开发构建和生产构建/打包通过。
- 完整 `pnpm lint` 未通过：同一 Windows 环境中原始基线有 178 项格式诊断，本分支有 172 项；没有批量格式化无关文件。该结果不等于全库检查通过。
- 自动回归使用合成 DOM 与素材，不能替代平台实机验收。对应封面流程曾在本地适配的 1.5.1 运行包中人工验收四平台上传及保存；该包含额外本地集成，和本公开源码构建不等价。本 PR 源码构建尚未单独实机验收，不继承该运行包的验收结论。
- 本次验证没有点击最终发布，也没有把本地集成、私有 Agent 模块或账号数据纳入源码。
