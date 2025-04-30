-- CreateTable
CREATE TABLE "FileHosting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "times" INTEGER NOT NULL DEFAULT 0,
    "filename" TEXT,
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileHosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileHosting_id_key" ON "FileHosting"("id");

-- AddForeignKey
ALTER TABLE "FileHosting" ADD CONSTRAINT "FileHosting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
