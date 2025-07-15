-- CreateTable
CREATE TABLE "DynamicDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicDraft_id_key" ON "DynamicDraft"("id");

-- CreateIndex
CREATE INDEX "DynamicDraft_userId_idx" ON "DynamicDraft"("userId");

-- CreateIndex
CREATE INDEX "DynamicDraft_createdAt_idx" ON "DynamicDraft"("createdAt");

-- AddForeignKey
ALTER TABLE "DynamicDraft" ADD CONSTRAINT "DynamicDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
