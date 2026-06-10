-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedBool" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BetterAuthSession" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BetterAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetterAuthAccount" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "tokenType" TEXT,
    "sessionState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetterAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetterAuthVerification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetterAuthVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetterAuthPasskey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3),
    "aaguid" TEXT,

    CONSTRAINT "BetterAuthPasskey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetterAuthSession_token_key" ON "BetterAuthSession"("token");

-- CreateIndex
CREATE INDEX "BetterAuthSession_userId_idx" ON "BetterAuthSession"("userId");

-- CreateIndex
CREATE INDEX "BetterAuthAccount_userId_idx" ON "BetterAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BetterAuthAccount_providerId_accountId_key" ON "BetterAuthAccount"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "BetterAuthVerification_identifier_idx" ON "BetterAuthVerification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "BetterAuthPasskey_credentialID_key" ON "BetterAuthPasskey"("credentialID");

-- CreateIndex
CREATE INDEX "BetterAuthPasskey_userId_idx" ON "BetterAuthPasskey"("userId");

-- AddForeignKey
ALTER TABLE "BetterAuthSession" ADD CONSTRAINT "BetterAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetterAuthAccount" ADD CONSTRAINT "BetterAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetterAuthPasskey" ADD CONSTRAINT "BetterAuthPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
