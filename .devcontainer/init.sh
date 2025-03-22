#!/bin/bash
# 安装依赖
pnpm install
# 生成 prisma 代码
sh prisma/generate.sh
# 初始化数据库
docker compose -f .devcontainer/dev-db/docker-compose.yml up -d
