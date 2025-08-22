/*
  Warnings:

  - You are about to drop the column `fileHostingId` on the `ImageGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `response` on the `ImageGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `ImageGeneration` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `SocialMediaAccount` table. All the data in the column will be lost.
  - You are about to drop the column `extraData` on the `SocialMediaAccount` table. All the data in the column will be lost.
  - You are about to drop the column `profileUrl` on the `SocialMediaAccount` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `SocialMediaAccount` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,platform,platformId]` on the table `SocialMediaAccount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accessToken` to the `SocialMediaAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform` to the `SocialMediaAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformId` to the `SocialMediaAccount` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ImageGeneration" DROP CONSTRAINT "ImageGeneration_fileHostingId_fkey";

-- DropIndex
DROP INDEX "public"."SocialMediaAccount_userId_provider_accountId_key";

-- AlterTable
ALTER TABLE "public"."ImageGeneration" DROP COLUMN "fileHostingId",
DROP COLUMN "response",
DROP COLUMN "result",
ADD COLUMN     "message" TEXT,
ADD COLUMN     "workflowId" TEXT;

-- AlterTable
ALTER TABLE "public"."SocialMediaAccount" DROP COLUMN "accountId",
DROP COLUMN "extraData",
DROP COLUMN "profileUrl",
DROP COLUMN "provider",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "platform" TEXT NOT NULL,
ADD COLUMN     "platformId" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "scope" TEXT,
ADD COLUMN     "tokenType" TEXT NOT NULL DEFAULT 'Bearer';

-- CreateTable
CREATE TABLE "public"."ImageGenerationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageGenerationId" TEXT NOT NULL,
    "error" TEXT,
    "response" JSONB,
    "url" TEXT,
    "fileHostingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublishTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PublishTaskLog" (
    "id" TEXT NOT NULL,
    "publishTaskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "publishData" JSONB,
    "result" JSONB,
    "error" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishTaskLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageGenerationLog_id_key" ON "public"."ImageGenerationLog"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PublishTask_id_key" ON "public"."PublishTask"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PublishTaskLog_id_key" ON "public"."PublishTaskLog"("id");

-- CreateIndex
CREATE INDEX "SocialMediaAccount_userId_idx" ON "public"."SocialMediaAccount"("userId");

-- CreateIndex
CREATE INDEX "SocialMediaAccount_platform_idx" ON "public"."SocialMediaAccount"("platform");

-- CreateIndex
CREATE INDEX "SocialMediaAccount_expiresAt_idx" ON "public"."SocialMediaAccount"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaAccount_userId_platform_platformId_key" ON "public"."SocialMediaAccount"("userId", "platform", "platformId");

-- AddForeignKey
ALTER TABLE "public"."ImageGenerationLog" ADD CONSTRAINT "ImageGenerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImageGenerationLog" ADD CONSTRAINT "ImageGenerationLog_imageGenerationId_fkey" FOREIGN KEY ("imageGenerationId") REFERENCES "public"."ImageGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImageGenerationLog" ADD CONSTRAINT "ImageGenerationLog_fileHostingId_fkey" FOREIGN KEY ("fileHostingId") REFERENCES "public"."FileHosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublishTask" ADD CONSTRAINT "PublishTask_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublishTask" ADD CONSTRAINT "PublishTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublishTaskLog" ADD CONSTRAINT "PublishTaskLog_publishTaskId_fkey" FOREIGN KEY ("publishTaskId") REFERENCES "public"."PublishTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublishTaskLog" ADD CONSTRAINT "PublishTaskLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
