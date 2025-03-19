-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "domain" VARCHAR(500),
    "shareId" VARCHAR(50),
    "resetAt" TIMESTAMP(3),
    "userId" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteEvent" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urlPath" VARCHAR(500) NOT NULL,
    "urlQuery" VARCHAR(500),
    "referrerPath" VARCHAR(500),
    "referrerQuery" VARCHAR(500),
    "referrerDomain" VARCHAR(500),
    "pageTitle" VARCHAR(500),
    "eventType" INTEGER NOT NULL DEFAULT 1,
    "eventName" VARCHAR(50),
    "tag" VARCHAR(50),

    CONSTRAINT "WebsiteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventData" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "websiteEventId" TEXT NOT NULL,
    "dataKey" TEXT NOT NULL,
    "stringValue" VARCHAR(500),
    "numberValue" DECIMAL(19,4),
    "dateValue" TIMESTAMP(3),
    "dataType" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorSession" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "hostname" VARCHAR(100),
    "browser" VARCHAR(20),
    "os" VARCHAR(20),
    "device" VARCHAR(20),
    "screen" VARCHAR(11),
    "language" VARCHAR(35),
    "country" CHAR(2),
    "subdivision1" VARCHAR(20),
    "subdivision2" VARCHAR(50),
    "city" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionData" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dataKey" TEXT NOT NULL,
    "stringValue" VARCHAR(500),
    "numberValue" DECIMAL(19,4),
    "dateValue" TIMESTAMP(3),
    "dataType" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" VARCHAR(200) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "parameters" VARCHAR(6000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Website_id_key" ON "Website"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Website_shareId_key" ON "Website"("shareId");

-- CreateIndex
CREATE INDEX "Website_userId_idx" ON "Website"("userId");

-- CreateIndex
CREATE INDEX "Website_createdAt_idx" ON "Website"("createdAt");

-- CreateIndex
CREATE INDEX "Website_shareId_idx" ON "Website"("shareId");

-- CreateIndex
CREATE INDEX "WebsiteEvent_createdAt_idx" ON "WebsiteEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WebsiteEvent_sessionId_idx" ON "WebsiteEvent"("sessionId");

-- CreateIndex
CREATE INDEX "WebsiteEvent_visitId_idx" ON "WebsiteEvent"("visitId");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_idx" ON "WebsiteEvent"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_createdAt_idx" ON "WebsiteEvent"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_createdAt_urlPath_idx" ON "WebsiteEvent"("websiteId", "createdAt", "urlPath");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_createdAt_urlQuery_idx" ON "WebsiteEvent"("websiteId", "createdAt", "urlQuery");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_createdAt_referrerDomain_idx" ON "WebsiteEvent"("websiteId", "createdAt", "referrerDomain");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_createdAt_pageTitle_idx" ON "WebsiteEvent"("websiteId", "createdAt", "pageTitle");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_createdAt_eventName_idx" ON "WebsiteEvent"("websiteId", "createdAt", "eventName");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_createdAt_tag_idx" ON "WebsiteEvent"("websiteId", "createdAt", "tag");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_sessionId_createdAt_idx" ON "WebsiteEvent"("websiteId", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteEvent_websiteId_visitId_createdAt_idx" ON "WebsiteEvent"("websiteId", "visitId", "createdAt");

-- CreateIndex
CREATE INDEX "EventData_createdAt_idx" ON "EventData"("createdAt");

-- CreateIndex
CREATE INDEX "EventData_websiteId_idx" ON "EventData"("websiteId");

-- CreateIndex
CREATE INDEX "EventData_websiteEventId_idx" ON "EventData"("websiteEventId");

-- CreateIndex
CREATE INDEX "EventData_websiteId_createdAt_idx" ON "EventData"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "EventData_websiteId_createdAt_dataKey_idx" ON "EventData"("websiteId", "createdAt", "dataKey");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorSession_id_key" ON "VisitorSession"("id");

-- CreateIndex
CREATE INDEX "VisitorSession_createdAt_idx" ON "VisitorSession"("createdAt");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_idx" ON "VisitorSession"("websiteId");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_idx" ON "VisitorSession"("websiteId", "createdAt");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_hostname_idx" ON "VisitorSession"("websiteId", "createdAt", "hostname");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_browser_idx" ON "VisitorSession"("websiteId", "createdAt", "browser");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_os_idx" ON "VisitorSession"("websiteId", "createdAt", "os");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_device_idx" ON "VisitorSession"("websiteId", "createdAt", "device");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_screen_idx" ON "VisitorSession"("websiteId", "createdAt", "screen");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_language_idx" ON "VisitorSession"("websiteId", "createdAt", "language");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_country_idx" ON "VisitorSession"("websiteId", "createdAt", "country");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_subdivision1_idx" ON "VisitorSession"("websiteId", "createdAt", "subdivision1");

-- CreateIndex
CREATE INDEX "VisitorSession_websiteId_createdAt_city_idx" ON "VisitorSession"("websiteId", "createdAt", "city");

-- CreateIndex
CREATE INDEX "SessionData_createdAt_idx" ON "SessionData"("createdAt");

-- CreateIndex
CREATE INDEX "SessionData_websiteId_idx" ON "SessionData"("websiteId");

-- CreateIndex
CREATE INDEX "SessionData_sessionId_idx" ON "SessionData"("sessionId");

-- CreateIndex
CREATE INDEX "SessionData_sessionId_createdAt_idx" ON "SessionData"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionData_websiteId_createdAt_dataKey_idx" ON "SessionData"("websiteId", "createdAt", "dataKey");

-- CreateIndex
CREATE UNIQUE INDEX "Report_id_key" ON "Report"("id");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "Report_websiteId_idx" ON "Report"("websiteId");

-- CreateIndex
CREATE INDEX "Report_type_idx" ON "Report"("type");

-- CreateIndex
CREATE INDEX "Report_name_idx" ON "Report"("name");

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventData" ADD CONSTRAINT "EventData_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventData" ADD CONSTRAINT "EventData_websiteEventId_fkey" FOREIGN KEY ("websiteEventId") REFERENCES "WebsiteEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionData" ADD CONSTRAINT "SessionData_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionData" ADD CONSTRAINT "SessionData_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisitorSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
