#!/bin/bash

# 检查是否提供了参数
if [ $# -eq 0 ]; then
    echo "请提供一个迁移名称"
    exit 1
fi

# 使用提供的参数作为迁移名称
pnpm prisma migrate dev --schema prisma/schema_multipost.prisma --name "$1"
