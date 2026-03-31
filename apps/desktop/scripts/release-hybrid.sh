#!/bin/bash
set -e

# 发布流程：版本号自增 + 提交 + 打 tag + 推送
# CI 自动完成全部构建、签名、公证和发布

echo "MultiPost Desktop - 发布"
echo ""

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "当前版本: $CURRENT_VERSION"

NEW_VERSION=$(node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = pkg.version;
// 只使用正式版本号（patch 递增），不使用 build/pre-release 后缀
// electron-updater 使用 semver，pre-release 版本号会导致自动更新无法推送
const parts = currentVersion.replace(/-.*$/, '').split('.');
parts[2] = String(parseInt(parts[2]) + 1);
const newVersion = parts.join('.');
pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(newVersion);
")

echo "新版本: $NEW_VERSION"
echo ""

# 询问确认
read -p "是否继续发布 v$NEW_VERSION? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "取消发布"
  git checkout package.json
  exit 1
fi

# 提交版本更新
echo "提交版本更新..."
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin main
git push origin "v$NEW_VERSION"

echo ""
echo "发布已触发！CI 将自动完成构建、签名、公证和发布。"
echo ""
echo "查看构建进度: https://github.com/leaperone/MultiPost-Desktop-Release/actions"
echo "发布页面: https://github.com/leaperone/MultiPost-Desktop-Release/releases"
