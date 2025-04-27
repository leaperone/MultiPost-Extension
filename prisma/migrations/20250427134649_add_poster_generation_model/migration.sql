-- CreateTable
CREATE TABLE "PosterGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1080,
    "height" INTEGER NOT NULL DEFAULT 1480,
    "model" TEXT NOT NULL DEFAULT 'deepseek-v3',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "taskId" TEXT,
    "ownerId" TEXT,
    "projectId" TEXT,
    "urls" JSONB,
    "error" TEXT,
    "lastImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosterGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosterGeneration_id_key" ON "PosterGeneration"("id");

-- AddForeignKey
ALTER TABLE "PosterGeneration" ADD CONSTRAINT "PosterGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
