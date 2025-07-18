-- AlterTable
ALTER TABLE "FileHosting" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "ImageGeneration" ADD COLUMN     "fileHostingId" TEXT;

-- AlterTable
ALTER TABLE "PosterGeneration" ADD COLUMN     "fileHostingId" TEXT;

-- AddForeignKey
ALTER TABLE "ImageGeneration" ADD CONSTRAINT "ImageGeneration_fileHostingId_fkey" FOREIGN KEY ("fileHostingId") REFERENCES "FileHosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosterGeneration" ADD CONSTRAINT "PosterGeneration_fileHostingId_fkey" FOREIGN KEY ("fileHostingId") REFERENCES "FileHosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
