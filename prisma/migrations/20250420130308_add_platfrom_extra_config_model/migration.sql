-- CreateTable
CREATE TABLE "PlatformExtraConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformExtraConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformExtraConfig_id_key" ON "PlatformExtraConfig"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformExtraConfig_userId_platform_key" ON "PlatformExtraConfig"("userId", "platform");

-- AddForeignKey
ALTER TABLE "PlatformExtraConfig" ADD CONSTRAINT "PlatformExtraConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
