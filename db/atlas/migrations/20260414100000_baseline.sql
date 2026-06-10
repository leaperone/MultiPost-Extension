-- Add new schema named "public"
CREATE SCHEMA IF NOT EXISTS "public";
-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'standard public schema';
-- Create "VerificationToken" table
CREATE TABLE "public"."VerificationToken" ("identifier" text NOT NULL, "token" text NOT NULL, "expires" timestamp(3) NOT NULL, PRIMARY KEY ("identifier", "token"));
-- Create "User" table
CREATE TABLE "public"."User" ("id" text NOT NULL, "name" text NULL, "email" text NOT NULL, "emailVerified" timestamp(3) NULL, "image" text NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"));
-- Create index "User_email_key" to table: "User"
CREATE UNIQUE INDEX "User_email_key" ON "public"."User" ("email");
-- Create "APIKey" table
CREATE TABLE "public"."APIKey" ("id" text NOT NULL, "userId" text NOT NULL, "name" text NOT NULL, "key" text NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "APIKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "APIKey_id_key" to table: "APIKey"
CREATE UNIQUE INDEX "APIKey_id_key" ON "public"."APIKey" ("id");
-- Create index "APIKey_key_key" to table: "APIKey"
CREATE UNIQUE INDEX "APIKey_key_key" ON "public"."APIKey" ("key");
-- Create "Account" table
CREATE TABLE "public"."Account" ("userId" text NOT NULL, "type" text NOT NULL, "provider" text NOT NULL, "providerAccountId" text NOT NULL, "refresh_token" text NULL, "access_token" text NULL, "expires_at" integer NULL, "token_type" text NULL, "scope" text NULL, "id_token" text NULL, "session_state" text NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("provider", "providerAccountId"), CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create "Authenticator" table
CREATE TABLE "public"."Authenticator" ("credentialID" text NOT NULL, "userId" text NOT NULL, "providerAccountId" text NOT NULL, "credentialPublicKey" text NOT NULL, "counter" integer NOT NULL, "credentialDeviceType" text NOT NULL, "credentialBackedUp" boolean NOT NULL, "transports" text NULL, PRIMARY KEY ("userId", "credentialID"), CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "Authenticator_credentialID_key" to table: "Authenticator"
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "public"."Authenticator" ("credentialID");
-- Create "Credit" table
CREATE TABLE "public"."Credit" ("userId" text NOT NULL, "credits" numeric(38,18) NOT NULL, "freeCredits" numeric(38,18) NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, CONSTRAINT "Credit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "Credit_userId_key" to table: "Credit"
CREATE UNIQUE INDEX "Credit_userId_key" ON "public"."Credit" ("userId");
-- Create "CreditUsage" table
CREATE TABLE "public"."CreditUsage" ("id" text NOT NULL, "userId" text NOT NULL, "type" text NOT NULL, "amount" numeric(38,18) NOT NULL, "isFree" boolean NOT NULL DEFAULT false, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "CreditUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "CreditUsage_id_key" to table: "CreditUsage"
CREATE UNIQUE INDEX "CreditUsage_id_key" ON "public"."CreditUsage" ("id");
-- Create "Draft" table
CREATE TABLE "public"."Draft" ("id" text NOT NULL, "userId" text NOT NULL, "title" text NULL, "content" text NULL, "files" jsonb NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "Draft_createdAt_idx" to table: "Draft"
CREATE INDEX "Draft_createdAt_idx" ON "public"."Draft" ("createdAt");
-- Create index "Draft_id_key" to table: "Draft"
CREATE UNIQUE INDEX "Draft_id_key" ON "public"."Draft" ("id");
-- Create index "Draft_userId_idx" to table: "Draft"
CREATE INDEX "Draft_userId_idx" ON "public"."Draft" ("userId");
-- Create "VisitorSession" table
CREATE TABLE "public"."VisitorSession" ("id" text NOT NULL, "websiteId" text NOT NULL, "hostname" character varying(100) NULL, "browser" character varying(20) NULL, "os" character varying(20) NULL, "device" character varying(20) NULL, "screen" character varying(11) NULL, "language" character varying(35) NULL, "country" character(2) NULL, "subdivision1" character varying(20) NULL, "subdivision2" character varying(50) NULL, "city" character varying(50) NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "ip" character varying(50) NULL, PRIMARY KEY ("id"));
-- Create index "VisitorSession_createdAt_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_createdAt_idx" ON "public"."VisitorSession" ("createdAt");
-- Create index "VisitorSession_id_key" to table: "VisitorSession"
CREATE UNIQUE INDEX "VisitorSession_id_key" ON "public"."VisitorSession" ("id");
-- Create index "VisitorSession_websiteId_createdAt_browser_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_browser_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "browser");
-- Create index "VisitorSession_websiteId_createdAt_city_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_city_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "city");
-- Create index "VisitorSession_websiteId_createdAt_country_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_country_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "country");
-- Create index "VisitorSession_websiteId_createdAt_device_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_device_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "device");
-- Create index "VisitorSession_websiteId_createdAt_hostname_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_hostname_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "hostname");
-- Create index "VisitorSession_websiteId_createdAt_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_idx" ON "public"."VisitorSession" ("websiteId", "createdAt");
-- Create index "VisitorSession_websiteId_createdAt_language_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_language_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "language");
-- Create index "VisitorSession_websiteId_createdAt_os_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_os_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "os");
-- Create index "VisitorSession_websiteId_createdAt_screen_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_screen_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "screen");
-- Create index "VisitorSession_websiteId_createdAt_subdivision1_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_createdAt_subdivision1_idx" ON "public"."VisitorSession" ("websiteId", "createdAt", "subdivision1");
-- Create index "VisitorSession_websiteId_idx" to table: "VisitorSession"
CREATE INDEX "VisitorSession_websiteId_idx" ON "public"."VisitorSession" ("websiteId");
-- Create "WebsiteEvent" table
CREATE TABLE "public"."WebsiteEvent" ("id" text NOT NULL, "websiteId" text NOT NULL, "sessionId" text NOT NULL, "visitId" text NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "urlPath" character varying(500) NOT NULL, "urlQuery" character varying(500) NULL, "referrerPath" character varying(500) NULL, "referrerQuery" character varying(500) NULL, "referrerDomain" character varying(500) NULL, "pageTitle" character varying(500) NULL, "eventType" integer NOT NULL DEFAULT 1, "eventName" character varying(50) NULL, "tag" character varying(50) NULL, PRIMARY KEY ("id"), CONSTRAINT "WebsiteEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."VisitorSession" ("id") ON UPDATE CASCADE ON DELETE RESTRICT);
-- Create index "WebsiteEvent_createdAt_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_createdAt_idx" ON "public"."WebsiteEvent" ("createdAt");
-- Create index "WebsiteEvent_sessionId_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_sessionId_idx" ON "public"."WebsiteEvent" ("sessionId");
-- Create index "WebsiteEvent_visitId_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_visitId_idx" ON "public"."WebsiteEvent" ("visitId");
-- Create index "WebsiteEvent_websiteId_createdAt_eventName_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_createdAt_eventName_idx" ON "public"."WebsiteEvent" ("websiteId", "createdAt", "eventName");
-- Create index "WebsiteEvent_websiteId_createdAt_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_createdAt_idx" ON "public"."WebsiteEvent" ("websiteId", "createdAt");
-- Create index "WebsiteEvent_websiteId_createdAt_pageTitle_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_createdAt_pageTitle_idx" ON "public"."WebsiteEvent" ("websiteId", "createdAt", "pageTitle");
-- Create index "WebsiteEvent_websiteId_createdAt_referrerDomain_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_createdAt_referrerDomain_idx" ON "public"."WebsiteEvent" ("websiteId", "createdAt", "referrerDomain");
-- Create index "WebsiteEvent_websiteId_createdAt_tag_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_createdAt_tag_idx" ON "public"."WebsiteEvent" ("websiteId", "createdAt", "tag");
-- Create index "WebsiteEvent_websiteId_createdAt_urlPath_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_createdAt_urlPath_idx" ON "public"."WebsiteEvent" ("websiteId", "createdAt", "urlPath");
-- Create index "WebsiteEvent_websiteId_createdAt_urlQuery_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_createdAt_urlQuery_idx" ON "public"."WebsiteEvent" ("websiteId", "createdAt", "urlQuery");
-- Create index "WebsiteEvent_websiteId_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_idx" ON "public"."WebsiteEvent" ("websiteId");
-- Create index "WebsiteEvent_websiteId_sessionId_createdAt_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_sessionId_createdAt_idx" ON "public"."WebsiteEvent" ("websiteId", "sessionId", "createdAt");
-- Create index "WebsiteEvent_websiteId_visitId_createdAt_idx" to table: "WebsiteEvent"
CREATE INDEX "WebsiteEvent_websiteId_visitId_createdAt_idx" ON "public"."WebsiteEvent" ("websiteId", "visitId", "createdAt");
-- Create "Website" table
CREATE TABLE "public"."Website" ("id" text NOT NULL, "name" character varying(100) NOT NULL, "domain" character varying(500) NULL, "shareId" character varying(50) NULL, "resetAt" timestamp(3) NULL, "userId" character varying(50) NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "deletedAt" timestamp(3) NULL, PRIMARY KEY ("id"), CONSTRAINT "Website_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE RESTRICT);
-- Create index "Website_createdAt_idx" to table: "Website"
CREATE INDEX "Website_createdAt_idx" ON "public"."Website" ("createdAt");
-- Create index "Website_id_key" to table: "Website"
CREATE UNIQUE INDEX "Website_id_key" ON "public"."Website" ("id");
-- Create index "Website_shareId_idx" to table: "Website"
CREATE INDEX "Website_shareId_idx" ON "public"."Website" ("shareId");
-- Create index "Website_shareId_key" to table: "Website"
CREATE UNIQUE INDEX "Website_shareId_key" ON "public"."Website" ("shareId");
-- Create index "Website_userId_idx" to table: "Website"
CREATE INDEX "Website_userId_idx" ON "public"."Website" ("userId");
-- Create "EventData" table
CREATE TABLE "public"."EventData" ("id" text NOT NULL, "websiteId" text NOT NULL, "websiteEventId" text NOT NULL, "dataKey" text NOT NULL, "stringValue" character varying(500) NULL, "numberValue" numeric(19,4) NULL, "dateValue" timestamp(3) NULL, "dataType" integer NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("id"), CONSTRAINT "EventData_websiteEventId_fkey" FOREIGN KEY ("websiteEventId") REFERENCES "public"."WebsiteEvent" ("id") ON UPDATE CASCADE ON DELETE RESTRICT, CONSTRAINT "EventData_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."Website" ("id") ON UPDATE CASCADE ON DELETE RESTRICT);
-- Create index "EventData_createdAt_idx" to table: "EventData"
CREATE INDEX "EventData_createdAt_idx" ON "public"."EventData" ("createdAt");
-- Create index "EventData_websiteEventId_idx" to table: "EventData"
CREATE INDEX "EventData_websiteEventId_idx" ON "public"."EventData" ("websiteEventId");
-- Create index "EventData_websiteId_createdAt_dataKey_idx" to table: "EventData"
CREATE INDEX "EventData_websiteId_createdAt_dataKey_idx" ON "public"."EventData" ("websiteId", "createdAt", "dataKey");
-- Create index "EventData_websiteId_createdAt_idx" to table: "EventData"
CREATE INDEX "EventData_websiteId_createdAt_idx" ON "public"."EventData" ("websiteId", "createdAt");
-- Create index "EventData_websiteId_idx" to table: "EventData"
CREATE INDEX "EventData_websiteId_idx" ON "public"."EventData" ("websiteId");
-- Create "ExtensionClient" table
CREATE TABLE "public"."ExtensionClient" ("id" text NOT NULL, "userId" text NOT NULL, "name" text NOT NULL, "extensionVersion" text NOT NULL DEFAULT 'unknown', "platformInfos" jsonb NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "deletedAt" timestamp(3) NULL, PRIMARY KEY ("id"), CONSTRAINT "ExtensionClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "ExtensionClient_id_key" to table: "ExtensionClient"
CREATE UNIQUE INDEX "ExtensionClient_id_key" ON "public"."ExtensionClient" ("id");
-- Create "ExtensionTask" table
CREATE TABLE "public"."ExtensionTask" ("id" text NOT NULL, "userId" text NOT NULL, "taskType" text NOT NULL, "taskData" jsonb NOT NULL, "status" text NOT NULL, "targetClientId" text NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "ExtensionTask_targetClientId_fkey" FOREIGN KEY ("targetClientId") REFERENCES "public"."ExtensionClient" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "ExtensionTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "ExtensionTask_id_key" to table: "ExtensionTask"
CREATE UNIQUE INDEX "ExtensionTask_id_key" ON "public"."ExtensionTask" ("id");
-- Create "FileHosting" table
CREATE TABLE "public"."FileHosting" ("id" text NOT NULL, "userId" text NOT NULL, "key" text NOT NULL, "type" text NULL, "size" integer NOT NULL DEFAULT 0, "times" integer NOT NULL DEFAULT 0, "filename" text NULL, "expiredAt" timestamp(3) NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "previewUrl" text NULL, "deletedAt" timestamp(3) NULL, "source" text NULL, PRIMARY KEY ("id"), CONSTRAINT "FileHosting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "FileHosting_id_key" to table: "FileHosting"
CREATE UNIQUE INDEX "FileHosting_id_key" ON "public"."FileHosting" ("id");
-- Create "ImageGeneration" table
CREATE TABLE "public"."ImageGeneration" ("id" text NOT NULL, "userId" text NOT NULL, "prompt" text NOT NULL, "extraPrompt" text NULL, "images" jsonb NULL, "mask" jsonb NULL, "number" integer NOT NULL DEFAULT 1, "size" text NOT NULL DEFAULT 'auto', "quality" text NOT NULL DEFAULT 'auto', "background" text NOT NULL DEFAULT 'auto', "status" text NOT NULL DEFAULT 'pending', "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "message" text NULL, "workflowId" text NULL, PRIMARY KEY ("id"), CONSTRAINT "ImageGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "ImageGeneration_id_key" to table: "ImageGeneration"
CREATE UNIQUE INDEX "ImageGeneration_id_key" ON "public"."ImageGeneration" ("id");
-- Create "ImageGenerationLog" table
CREATE TABLE "public"."ImageGenerationLog" ("id" text NOT NULL, "userId" text NOT NULL, "imageGenerationId" text NOT NULL, "error" text NULL, "response" jsonb NULL, "url" text NULL, "fileHostingId" text NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "previewUrl" text NULL, PRIMARY KEY ("id"), CONSTRAINT "ImageGenerationLog_fileHostingId_fkey" FOREIGN KEY ("fileHostingId") REFERENCES "public"."FileHosting" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "ImageGenerationLog_imageGenerationId_fkey" FOREIGN KEY ("imageGenerationId") REFERENCES "public"."ImageGeneration" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "ImageGenerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "ImageGenerationLog_id_key" to table: "ImageGenerationLog"
CREATE UNIQUE INDEX "ImageGenerationLog_id_key" ON "public"."ImageGenerationLog" ("id");
-- Create "PlatformExtraConfig" table
CREATE TABLE "public"."PlatformExtraConfig" ("id" text NOT NULL, "userId" text NOT NULL, "platform" text NOT NULL, "data" jsonb NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "PlatformExtraConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "PlatformExtraConfig_id_key" to table: "PlatformExtraConfig"
CREATE UNIQUE INDEX "PlatformExtraConfig_id_key" ON "public"."PlatformExtraConfig" ("id");
-- Create index "PlatformExtraConfig_userId_platform_key" to table: "PlatformExtraConfig"
CREATE UNIQUE INDEX "PlatformExtraConfig_userId_platform_key" ON "public"."PlatformExtraConfig" ("userId", "platform");
-- Create "PosterGeneration" table
CREATE TABLE "public"."PosterGeneration" ("id" text NOT NULL, "userId" text NOT NULL, "prompt" text NOT NULL, "width" integer NOT NULL DEFAULT 1080, "height" integer NOT NULL DEFAULT 1480, "model" text NOT NULL DEFAULT 'deepseek-v3', "status" text NOT NULL DEFAULT 'pending', "taskId" text NULL, "projectId" text NULL, "urls" jsonb NULL, "error" text NULL, "lastImageUrl" text NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "systemPrompt" text NULL, "fileHostingId" text NULL, "seedeToken" text NULL, "seedeTokenExpiresAt" timestamp(3) NULL, PRIMARY KEY ("id"), CONSTRAINT "PosterGeneration_fileHostingId_fkey" FOREIGN KEY ("fileHostingId") REFERENCES "public"."FileHosting" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "PosterGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "PosterGeneration_id_key" to table: "PosterGeneration"
CREATE UNIQUE INDEX "PosterGeneration_id_key" ON "public"."PosterGeneration" ("id");
-- Create "PromotionTask" table
CREATE TABLE "public"."PromotionTask" ("id" text NOT NULL, "userId" text NOT NULL, "taskType" text NOT NULL, "title" text NOT NULL, "description" text NULL, "link" text NULL, "keywords" text[] NULL, "examples" text[] NULL, "expiredAt" timestamp(3) NOT NULL, "reward" numeric(38,18) NOT NULL DEFAULT 0, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "PromotionTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "PromotionTask_id_key" to table: "PromotionTask"
CREATE UNIQUE INDEX "PromotionTask_id_key" ON "public"."PromotionTask" ("id");
-- Create "PromotionCode" table
CREATE TABLE "public"."PromotionCode" ("id" text NOT NULL, "taskId" text NOT NULL, "code" text NOT NULL, "userId" text NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "PromotionCode_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."PromotionTask" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "PromotionCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "PromotionCode_code_key" to table: "PromotionCode"
CREATE UNIQUE INDEX "PromotionCode_code_key" ON "public"."PromotionCode" ("code");
-- Create index "PromotionCode_id_key" to table: "PromotionCode"
CREATE UNIQUE INDEX "PromotionCode_id_key" ON "public"."PromotionCode" ("id");
-- Create index "PromotionCode_taskId_code_key" to table: "PromotionCode"
CREATE UNIQUE INDEX "PromotionCode_taskId_code_key" ON "public"."PromotionCode" ("taskId", "code");
-- Create "PromotionSubmission" table
CREATE TABLE "public"."PromotionSubmission" ("id" text NOT NULL, "taskId" text NOT NULL, "userId" text NOT NULL, "link" text NOT NULL, "scrapedData" jsonb NOT NULL, "verifiedData" jsonb NOT NULL, "status" text NOT NULL, "reason" text NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "PromotionSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."PromotionTask" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "PromotionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "PromotionSubmission_id_key" to table: "PromotionSubmission"
CREATE UNIQUE INDEX "PromotionSubmission_id_key" ON "public"."PromotionSubmission" ("id");
-- Create "PublishTask" table
CREATE TABLE "public"."PublishTask" ("id" text NOT NULL, "userId" text NOT NULL, "draftId" text NOT NULL, "publishedAt" timestamp(3) NOT NULL, "status" text NOT NULL DEFAULT 'pending', "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "PublishTask_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."Draft" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "PublishTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE RESTRICT);
-- Create index "PublishTask_id_key" to table: "PublishTask"
CREATE UNIQUE INDEX "PublishTask_id_key" ON "public"."PublishTask" ("id");
-- Create "PublishTaskLog" table
CREATE TABLE "public"."PublishTaskLog" ("id" text NOT NULL, "publishTaskId" text NOT NULL, "userId" text NOT NULL, "platform" text NOT NULL, "platformId" text NOT NULL, "publishedAt" timestamp(3) NULL, "status" text NOT NULL DEFAULT 'pending', "publishData" jsonb NULL, "result" jsonb NULL, "error" text NULL, "message" text NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "PublishTaskLog_publishTaskId_fkey" FOREIGN KEY ("publishTaskId") REFERENCES "public"."PublishTask" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "PublishTaskLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE RESTRICT);
-- Create index "PublishTaskLog_id_key" to table: "PublishTaskLog"
CREATE UNIQUE INDEX "PublishTaskLog_id_key" ON "public"."PublishTaskLog" ("id");
-- Create "RechargeCredit" table
CREATE TABLE "public"."RechargeCredit" ("id" text NOT NULL, "userId" text NOT NULL, "orderId" text NOT NULL, "type" text NOT NULL, "amount" numeric(38,18) NOT NULL, "status" text NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "RechargeCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "RechargeCredit_id_key" to table: "RechargeCredit"
CREATE UNIQUE INDEX "RechargeCredit_id_key" ON "public"."RechargeCredit" ("id");
-- Create index "RechargeCredit_orderId_key" to table: "RechargeCredit"
CREATE UNIQUE INDEX "RechargeCredit_orderId_key" ON "public"."RechargeCredit" ("orderId");
-- Create "Session" table
CREATE TABLE "public"."Session" ("sessionToken" text NOT NULL, "userId" text NOT NULL, "expires" timestamp(3) NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "Session_sessionToken_key" to table: "Session"
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session" ("sessionToken");
-- Create "SessionData" table
CREATE TABLE "public"."SessionData" ("id" text NOT NULL, "websiteId" text NOT NULL, "sessionId" text NOT NULL, "dataKey" text NOT NULL, "stringValue" character varying(500) NULL, "numberValue" numeric(19,4) NULL, "dateValue" timestamp(3) NULL, "dataType" integer NOT NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("id"), CONSTRAINT "SessionData_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."VisitorSession" ("id") ON UPDATE CASCADE ON DELETE RESTRICT, CONSTRAINT "SessionData_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."Website" ("id") ON UPDATE CASCADE ON DELETE RESTRICT);
-- Create index "SessionData_createdAt_idx" to table: "SessionData"
CREATE INDEX "SessionData_createdAt_idx" ON "public"."SessionData" ("createdAt");
-- Create index "SessionData_sessionId_createdAt_idx" to table: "SessionData"
CREATE INDEX "SessionData_sessionId_createdAt_idx" ON "public"."SessionData" ("sessionId", "createdAt");
-- Create index "SessionData_sessionId_idx" to table: "SessionData"
CREATE INDEX "SessionData_sessionId_idx" ON "public"."SessionData" ("sessionId");
-- Create index "SessionData_websiteId_createdAt_dataKey_idx" to table: "SessionData"
CREATE INDEX "SessionData_websiteId_createdAt_dataKey_idx" ON "public"."SessionData" ("websiteId", "createdAt", "dataKey");
-- Create index "SessionData_websiteId_idx" to table: "SessionData"
CREATE INDEX "SessionData_websiteId_idx" ON "public"."SessionData" ("websiteId");
-- Create "SocialMediaAccount" table
CREATE TABLE "public"."SocialMediaAccount" ("id" text NOT NULL, "userId" text NOT NULL, "username" text NULL, "avatarUrl" text NULL, "description" text NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "accessToken" text NOT NULL, "displayName" text NULL, "expiresAt" timestamp(3) NULL, "isActive" boolean NOT NULL DEFAULT true, "metadata" jsonb NULL, "platform" text NOT NULL, "platformId" text NOT NULL, "refreshToken" text NULL, "scope" text NULL, "tokenType" text NOT NULL DEFAULT 'Bearer', PRIMARY KEY ("id"), CONSTRAINT "SocialMediaAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "SocialMediaAccount_expiresAt_idx" to table: "SocialMediaAccount"
CREATE INDEX "SocialMediaAccount_expiresAt_idx" ON "public"."SocialMediaAccount" ("expiresAt");
-- Create index "SocialMediaAccount_id_key" to table: "SocialMediaAccount"
CREATE UNIQUE INDEX "SocialMediaAccount_id_key" ON "public"."SocialMediaAccount" ("id");
-- Create index "SocialMediaAccount_platform_idx" to table: "SocialMediaAccount"
CREATE INDEX "SocialMediaAccount_platform_idx" ON "public"."SocialMediaAccount" ("platform");
-- Create index "SocialMediaAccount_userId_idx" to table: "SocialMediaAccount"
CREATE INDEX "SocialMediaAccount_userId_idx" ON "public"."SocialMediaAccount" ("userId");
-- Create index "SocialMediaAccount_userId_platform_platformId_key" to table: "SocialMediaAccount"
CREATE UNIQUE INDEX "SocialMediaAccount_userId_platform_platformId_key" ON "public"."SocialMediaAccount" ("userId", "platform", "platformId");
-- Create "SupportConversation" table
CREATE TABLE "public"."SupportConversation" ("id" text NOT NULL, "userId" text NOT NULL, "status" text NOT NULL DEFAULT 'open', "category" text NOT NULL DEFAULT 'other', "subject" text NULL, "priority" text NOT NULL DEFAULT 'normal', "satisfactionRating" integer NULL, "satisfactionComment" text NULL, "metadata" jsonb NULL, "assignedTo" text NULL, "pageUrl" text NULL, "lastMessageContent" text NULL, "lastMessageAt" timestamp(3) NULL, "lastMessageRole" text NULL, "hasUnreadReply" boolean NOT NULL DEFAULT false, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, "resolvedAt" timestamp(3) NULL, "closedAt" timestamp(3) NULL, "firstResponseAt" timestamp(3) NULL, PRIMARY KEY ("id"), CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "SupportConversation_assignedTo_idx" to table: "SupportConversation"
CREATE INDEX "SupportConversation_assignedTo_idx" ON "public"."SupportConversation" ("assignedTo");
-- Create index "SupportConversation_category_idx" to table: "SupportConversation"
CREATE INDEX "SupportConversation_category_idx" ON "public"."SupportConversation" ("category");
-- Create index "SupportConversation_createdAt_idx" to table: "SupportConversation"
CREATE INDEX "SupportConversation_createdAt_idx" ON "public"."SupportConversation" ("createdAt");
-- Create index "SupportConversation_status_idx" to table: "SupportConversation"
CREATE INDEX "SupportConversation_status_idx" ON "public"."SupportConversation" ("status");
-- Create index "SupportConversation_userId_idx" to table: "SupportConversation"
CREATE INDEX "SupportConversation_userId_idx" ON "public"."SupportConversation" ("userId");
-- Create index "SupportConversation_userId_status_idx" to table: "SupportConversation"
CREATE INDEX "SupportConversation_userId_status_idx" ON "public"."SupportConversation" ("userId", "status");
-- Create "SupportMessage" table
CREATE TABLE "public"."SupportMessage" ("id" text NOT NULL, "conversationId" text NOT NULL, "role" text NOT NULL, "senderUserId" text NULL, "content" text NOT NULL, "attachments" jsonb NULL, "isInternal" boolean NOT NULL DEFAULT false, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY ("id"), CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."SupportConversation" ("id") ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT "SupportMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE SET NULL);
-- Create index "SupportMessage_conversationId_createdAt_idx" to table: "SupportMessage"
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "public"."SupportMessage" ("conversationId", "createdAt");
-- Create "VideoTranscription" table
CREATE TABLE "public"."VideoTranscription" ("id" text NOT NULL, "userId" text NOT NULL, "videoUrl" text NOT NULL, "videoId" text NULL, "platform" text NULL, "audioUrl" text NULL, "duration" integer NULL, "transcript" text NULL, "status" text NOT NULL DEFAULT 'pending', "error" text NULL, "metadata" jsonb NULL, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "VideoTranscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User" ("id") ON UPDATE CASCADE ON DELETE CASCADE);
-- Create index "VideoTranscription_createdAt_idx" to table: "VideoTranscription"
CREATE INDEX "VideoTranscription_createdAt_idx" ON "public"."VideoTranscription" ("createdAt");
-- Create index "VideoTranscription_id_key" to table: "VideoTranscription"
CREATE UNIQUE INDEX "VideoTranscription_id_key" ON "public"."VideoTranscription" ("id");
-- Create index "VideoTranscription_status_idx" to table: "VideoTranscription"
CREATE INDEX "VideoTranscription_status_idx" ON "public"."VideoTranscription" ("status");
-- Create index "VideoTranscription_userId_idx" to table: "VideoTranscription"
CREATE INDEX "VideoTranscription_userId_idx" ON "public"."VideoTranscription" ("userId");
