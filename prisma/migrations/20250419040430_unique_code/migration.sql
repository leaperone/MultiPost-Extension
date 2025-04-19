/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `PromotionCode` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PromotionCode_code_key" ON "PromotionCode"("code");
