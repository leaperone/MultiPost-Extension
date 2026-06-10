#!/bin/bash
# 安装依赖
pnpm install
# 初始化数据库
cp .devcontainer/dev-db/docker-compose.yml.example .devcontainer/dev-db/docker-compose.yml
make dev

envx pull dev
