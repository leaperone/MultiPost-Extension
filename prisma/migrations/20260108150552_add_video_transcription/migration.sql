-- CreateTable
CREATE TABLE "public"."VideoTranscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoId" TEXT,
    "platform" TEXT,
    "audioUrl" TEXT,
    "duration" INTEGER,
    "transcript" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTranscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoTranscription_id_key" ON "public"."VideoTranscription"("id");

-- CreateIndex
CREATE INDEX "VideoTranscription_userId_idx" ON "public"."VideoTranscription"("userId");

-- CreateIndex
CREATE INDEX "VideoTranscription_status_idx" ON "public"."VideoTranscription"("status");

-- CreateIndex
CREATE INDEX "VideoTranscription_createdAt_idx" ON "public"."VideoTranscription"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."VideoTranscription" ADD CONSTRAINT "VideoTranscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
