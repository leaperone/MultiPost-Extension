CREATE TABLE "Account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	CONSTRAINT "Account_pkey" PRIMARY KEY("provider","providerAccountId")
);

CREATE TABLE "Authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "Authenticator_pkey" PRIMARY KEY("userId","credentialID")
);

CREATE TABLE "BetterAuthAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp (3),
	"refreshTokenExpiresAt" timestamp (3),
	"scope" text,
	"password" text,
	"tokenType" text,
	"sessionState" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "BetterAuthPasskey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"publicKey" text NOT NULL,
	"userId" text NOT NULL,
	"credentialID" text NOT NULL,
	"counter" integer NOT NULL,
	"deviceType" text NOT NULL,
	"backedUp" boolean NOT NULL,
	"transports" text,
	"createdAt" timestamp (3),
	"aaguid" text
);

CREATE TABLE "BetterAuthSession" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL
);

CREATE TABLE "BetterAuthVerification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "Session" (
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp (3),
	"image" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"emailVerifiedBool" boolean DEFAULT false NOT NULL
);

CREATE TABLE "VerificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp (3) NOT NULL,
	CONSTRAINT "VerificationToken_pkey" PRIMARY KEY("identifier","token")
);

CREATE TABLE "APIKey" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "Credit" (
	"userId" text NOT NULL,
	"credits" numeric(38, 18) NOT NULL,
	"freeCredits" numeric(38, 18) NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "CreditUsage" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(38, 18) NOT NULL,
	"isFree" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "Draft" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text,
	"content" text,
	"files" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "EventData" (
	"id" text PRIMARY KEY NOT NULL,
	"websiteId" text NOT NULL,
	"websiteEventId" text NOT NULL,
	"dataKey" text NOT NULL,
	"stringValue" varchar(500),
	"numberValue" numeric(19, 4),
	"dateValue" timestamp (3),
	"dataType" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "ExtensionClient" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"extensionVersion" text DEFAULT 'unknown' NOT NULL,
	"platformInfos" jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);

CREATE TABLE "ExtensionTask" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"taskType" text NOT NULL,
	"taskData" jsonb NOT NULL,
	"status" text NOT NULL,
	"targetClientId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "FileHosting" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"key" text NOT NULL,
	"type" text,
	"size" integer DEFAULT 0 NOT NULL,
	"times" integer DEFAULT 0 NOT NULL,
	"filename" text,
	"expiredAt" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"previewUrl" text,
	"deletedAt" timestamp (3),
	"source" text
);

CREATE TABLE "ImageGeneration" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"prompt" text NOT NULL,
	"extraPrompt" text,
	"images" jsonb,
	"mask" jsonb,
	"number" integer DEFAULT 1 NOT NULL,
	"size" text DEFAULT 'auto' NOT NULL,
	"quality" text DEFAULT 'auto' NOT NULL,
	"background" text DEFAULT 'auto' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"message" text,
	"workflowId" text
);

CREATE TABLE "ImageGenerationLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"imageGenerationId" text NOT NULL,
	"error" text,
	"response" jsonb,
	"url" text,
	"fileHostingId" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"previewUrl" text
);

CREATE TABLE "PlatformExtraConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"platform" text NOT NULL,
	"data" jsonb NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "PosterGeneration" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"prompt" text NOT NULL,
	"width" integer DEFAULT 1080 NOT NULL,
	"height" integer DEFAULT 1480 NOT NULL,
	"model" text DEFAULT 'deepseek-v3' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"taskId" text,
	"projectId" text,
	"urls" jsonb,
	"error" text,
	"lastImageUrl" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"systemPrompt" text,
	"fileHostingId" text,
	"seedeToken" text,
	"seedeTokenExpiresAt" timestamp (3)
);

CREATE TABLE "PromotionCode" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"code" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "PromotionSubmission" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"userId" text NOT NULL,
	"link" text NOT NULL,
	"scrapedData" jsonb NOT NULL,
	"verifiedData" jsonb NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "PromotionTask" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"taskType" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"link" text,
	"keywords" text[],
	"examples" text[],
	"expiredAt" timestamp (3) NOT NULL,
	"reward" numeric(38, 18) DEFAULT '0' NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "PublishTask" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"draftId" text NOT NULL,
	"publishedAt" timestamp (3) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "PublishTaskLog" (
	"id" text PRIMARY KEY NOT NULL,
	"publishTaskId" text NOT NULL,
	"userId" text NOT NULL,
	"platform" text NOT NULL,
	"platformId" text NOT NULL,
	"publishedAt" timestamp (3),
	"status" text DEFAULT 'pending' NOT NULL,
	"publishData" jsonb,
	"result" jsonb,
	"error" text,
	"message" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "RechargeCredit" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"orderId" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(38, 18) NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "SessionData" (
	"id" text PRIMARY KEY NOT NULL,
	"websiteId" text NOT NULL,
	"sessionId" text NOT NULL,
	"dataKey" text NOT NULL,
	"stringValue" varchar(500),
	"numberValue" numeric(19, 4),
	"dateValue" timestamp (3),
	"dataType" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "SocialMediaAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"username" text,
	"avatarUrl" text,
	"description" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"accessToken" text NOT NULL,
	"displayName" text,
	"expiresAt" timestamp (3),
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"platform" text NOT NULL,
	"platformId" text NOT NULL,
	"refreshToken" text,
	"scope" text,
	"tokenType" text DEFAULT 'Bearer' NOT NULL
);

CREATE TABLE "SupportConversation" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"subject" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"satisfactionRating" integer,
	"satisfactionComment" text,
	"metadata" jsonb,
	"assignedTo" text,
	"pageUrl" text,
	"lastMessageContent" text,
	"lastMessageAt" timestamp (3),
	"lastMessageRole" text,
	"hasUnreadReply" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"resolvedAt" timestamp (3),
	"closedAt" timestamp (3),
	"firstResponseAt" timestamp (3)
);

CREATE TABLE "SupportMessage" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"role" text NOT NULL,
	"senderUserId" text,
	"content" text NOT NULL,
	"attachments" jsonb,
	"isInternal" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "VideoTranscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"videoUrl" text NOT NULL,
	"videoId" text,
	"platform" text,
	"audioUrl" text,
	"duration" integer,
	"transcript" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"metadata" jsonb,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);

CREATE TABLE "VisitorSession" (
	"id" text PRIMARY KEY NOT NULL,
	"websiteId" text NOT NULL,
	"hostname" varchar(100),
	"browser" varchar(20),
	"os" varchar(20),
	"device" varchar(20),
	"screen" varchar(11),
	"language" varchar(35),
	"country" char(2),
	"subdivision1" varchar(20),
	"subdivision2" varchar(50),
	"city" varchar(50),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ip" varchar(50)
);

CREATE TABLE "Website" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"domain" varchar(500),
	"shareId" varchar(50),
	"resetAt" timestamp (3),
	"userId" varchar(50) NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletedAt" timestamp (3)
);

CREATE TABLE "WebsiteEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"websiteId" text NOT NULL,
	"sessionId" text NOT NULL,
	"visitId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"urlPath" varchar(500) NOT NULL,
	"urlQuery" varchar(500),
	"referrerPath" varchar(500),
	"referrerQuery" varchar(500),
	"referrerDomain" varchar(500),
	"pageTitle" varchar(500),
	"eventType" integer DEFAULT 1 NOT NULL,
	"eventName" varchar(50),
	"tag" varchar(50)
);

CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator" USING btree ("credentialID");
CREATE UNIQUE INDEX "BetterAuthAccount_providerId_accountId_key" ON "BetterAuthAccount" USING btree ("providerId","accountId");
CREATE INDEX "BetterAuthAccount_userId_idx" ON "BetterAuthAccount" USING btree ("userId");
CREATE UNIQUE INDEX "BetterAuthPasskey_credentialID_key" ON "BetterAuthPasskey" USING btree ("credentialID");
CREATE INDEX "BetterAuthPasskey_userId_idx" ON "BetterAuthPasskey" USING btree ("userId");
CREATE UNIQUE INDEX "BetterAuthSession_token_key" ON "BetterAuthSession" USING btree ("token");
CREATE INDEX "BetterAuthSession_userId_idx" ON "BetterAuthSession" USING btree ("userId");
CREATE INDEX "BetterAuthVerification_identifier_idx" ON "BetterAuthVerification" USING btree ("identifier");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session" USING btree ("sessionToken");
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree ("email");
CREATE UNIQUE INDEX "APIKey_id_key" ON "APIKey" USING btree ("id");
CREATE UNIQUE INDEX "APIKey_key_key" ON "APIKey" USING btree ("key");
CREATE UNIQUE INDEX "Credit_userId_key" ON "Credit" USING btree ("userId");
CREATE UNIQUE INDEX "CreditUsage_id_key" ON "CreditUsage" USING btree ("id");
CREATE INDEX "Draft_createdAt_idx" ON "Draft" USING btree ("createdAt");
CREATE UNIQUE INDEX "Draft_id_key" ON "Draft" USING btree ("id");
CREATE INDEX "Draft_userId_idx" ON "Draft" USING btree ("userId");
CREATE INDEX "EventData_createdAt_idx" ON "EventData" USING btree ("createdAt");
CREATE INDEX "EventData_websiteEventId_idx" ON "EventData" USING btree ("websiteEventId");
CREATE INDEX "EventData_websiteId_createdAt_dataKey_idx" ON "EventData" USING btree ("websiteId","createdAt","dataKey");
CREATE INDEX "EventData_websiteId_createdAt_idx" ON "EventData" USING btree ("websiteId","createdAt");
CREATE INDEX "EventData_websiteId_idx" ON "EventData" USING btree ("websiteId");
CREATE UNIQUE INDEX "ExtensionClient_id_key" ON "ExtensionClient" USING btree ("id");
CREATE UNIQUE INDEX "ExtensionTask_id_key" ON "ExtensionTask" USING btree ("id");
CREATE UNIQUE INDEX "FileHosting_id_key" ON "FileHosting" USING btree ("id");
CREATE UNIQUE INDEX "ImageGeneration_id_key" ON "ImageGeneration" USING btree ("id");
CREATE UNIQUE INDEX "ImageGenerationLog_id_key" ON "ImageGenerationLog" USING btree ("id");
CREATE UNIQUE INDEX "PlatformExtraConfig_id_key" ON "PlatformExtraConfig" USING btree ("id");
CREATE UNIQUE INDEX "PlatformExtraConfig_userId_platform_key" ON "PlatformExtraConfig" USING btree ("userId","platform");
CREATE UNIQUE INDEX "PosterGeneration_id_key" ON "PosterGeneration" USING btree ("id");
CREATE UNIQUE INDEX "PromotionCode_code_key" ON "PromotionCode" USING btree ("code");
CREATE UNIQUE INDEX "PromotionCode_id_key" ON "PromotionCode" USING btree ("id");
CREATE UNIQUE INDEX "PromotionCode_taskId_code_key" ON "PromotionCode" USING btree ("taskId","code");
CREATE UNIQUE INDEX "PromotionSubmission_id_key" ON "PromotionSubmission" USING btree ("id");
CREATE UNIQUE INDEX "PromotionTask_id_key" ON "PromotionTask" USING btree ("id");
CREATE UNIQUE INDEX "PublishTask_id_key" ON "PublishTask" USING btree ("id");
CREATE UNIQUE INDEX "PublishTaskLog_id_key" ON "PublishTaskLog" USING btree ("id");
CREATE UNIQUE INDEX "RechargeCredit_id_key" ON "RechargeCredit" USING btree ("id");
CREATE UNIQUE INDEX "RechargeCredit_orderId_key" ON "RechargeCredit" USING btree ("orderId");
CREATE INDEX "SessionData_createdAt_idx" ON "SessionData" USING btree ("createdAt");
CREATE INDEX "SessionData_sessionId_createdAt_idx" ON "SessionData" USING btree ("sessionId","createdAt");
CREATE INDEX "SessionData_sessionId_idx" ON "SessionData" USING btree ("sessionId");
CREATE INDEX "SessionData_websiteId_createdAt_dataKey_idx" ON "SessionData" USING btree ("websiteId","createdAt","dataKey");
CREATE INDEX "SessionData_websiteId_idx" ON "SessionData" USING btree ("websiteId");
CREATE INDEX "SocialMediaAccount_expiresAt_idx" ON "SocialMediaAccount" USING btree ("expiresAt");
CREATE UNIQUE INDEX "SocialMediaAccount_id_key" ON "SocialMediaAccount" USING btree ("id");
CREATE INDEX "SocialMediaAccount_platform_idx" ON "SocialMediaAccount" USING btree ("platform");
CREATE INDEX "SocialMediaAccount_userId_idx" ON "SocialMediaAccount" USING btree ("userId");
CREATE UNIQUE INDEX "SocialMediaAccount_userId_platform_platformId_key" ON "SocialMediaAccount" USING btree ("userId","platform","platformId");
CREATE INDEX "SupportConversation_assignedTo_idx" ON "SupportConversation" USING btree ("assignedTo");
CREATE INDEX "SupportConversation_category_idx" ON "SupportConversation" USING btree ("category");
CREATE INDEX "SupportConversation_createdAt_idx" ON "SupportConversation" USING btree ("createdAt");
CREATE INDEX "SupportConversation_status_idx" ON "SupportConversation" USING btree ("status");
CREATE INDEX "SupportConversation_userId_idx" ON "SupportConversation" USING btree ("userId");
CREATE INDEX "SupportConversation_userId_status_idx" ON "SupportConversation" USING btree ("userId","status");
CREATE INDEX "SupportMessage_conversationId_createdAt_idx" ON "SupportMessage" USING btree ("conversationId","createdAt");
CREATE INDEX "VideoTranscription_createdAt_idx" ON "VideoTranscription" USING btree ("createdAt");
CREATE UNIQUE INDEX "VideoTranscription_id_key" ON "VideoTranscription" USING btree ("id");
CREATE INDEX "VideoTranscription_status_idx" ON "VideoTranscription" USING btree ("status");
CREATE INDEX "VideoTranscription_userId_idx" ON "VideoTranscription" USING btree ("userId");
CREATE INDEX "VisitorSession_createdAt_idx" ON "VisitorSession" USING btree ("createdAt");
CREATE UNIQUE INDEX "VisitorSession_id_key" ON "VisitorSession" USING btree ("id");
CREATE INDEX "VisitorSession_websiteId_createdAt_browser_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","browser");
CREATE INDEX "VisitorSession_websiteId_createdAt_city_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","city");
CREATE INDEX "VisitorSession_websiteId_createdAt_country_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","country");
CREATE INDEX "VisitorSession_websiteId_createdAt_device_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","device");
CREATE INDEX "VisitorSession_websiteId_createdAt_hostname_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","hostname");
CREATE INDEX "VisitorSession_websiteId_createdAt_idx" ON "VisitorSession" USING btree ("websiteId","createdAt");
CREATE INDEX "VisitorSession_websiteId_createdAt_language_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","language");
CREATE INDEX "VisitorSession_websiteId_createdAt_os_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","os");
CREATE INDEX "VisitorSession_websiteId_createdAt_screen_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","screen");
CREATE INDEX "VisitorSession_websiteId_createdAt_subdivision1_idx" ON "VisitorSession" USING btree ("websiteId","createdAt","subdivision1");
CREATE INDEX "VisitorSession_websiteId_idx" ON "VisitorSession" USING btree ("websiteId");
CREATE INDEX "Website_createdAt_idx" ON "Website" USING btree ("createdAt");
CREATE UNIQUE INDEX "Website_id_key" ON "Website" USING btree ("id");
CREATE INDEX "Website_shareId_idx" ON "Website" USING btree ("shareId");
CREATE UNIQUE INDEX "Website_shareId_key" ON "Website" USING btree ("shareId");
CREATE INDEX "Website_userId_idx" ON "Website" USING btree ("userId");
CREATE INDEX "WebsiteEvent_createdAt_idx" ON "WebsiteEvent" USING btree ("createdAt");
CREATE INDEX "WebsiteEvent_sessionId_idx" ON "WebsiteEvent" USING btree ("sessionId");
CREATE INDEX "WebsiteEvent_visitId_idx" ON "WebsiteEvent" USING btree ("visitId");
CREATE INDEX "WebsiteEvent_websiteId_createdAt_eventName_idx" ON "WebsiteEvent" USING btree ("websiteId","createdAt","eventName");
CREATE INDEX "WebsiteEvent_websiteId_createdAt_idx" ON "WebsiteEvent" USING btree ("websiteId","createdAt");
CREATE INDEX "WebsiteEvent_websiteId_createdAt_pageTitle_idx" ON "WebsiteEvent" USING btree ("websiteId","createdAt","pageTitle");
CREATE INDEX "WebsiteEvent_websiteId_createdAt_referrerDomain_idx" ON "WebsiteEvent" USING btree ("websiteId","createdAt","referrerDomain");
CREATE INDEX "WebsiteEvent_websiteId_createdAt_tag_idx" ON "WebsiteEvent" USING btree ("websiteId","createdAt","tag");
CREATE INDEX "WebsiteEvent_websiteId_createdAt_urlPath_idx" ON "WebsiteEvent" USING btree ("websiteId","createdAt","urlPath");
CREATE INDEX "WebsiteEvent_websiteId_createdAt_urlQuery_idx" ON "WebsiteEvent" USING btree ("websiteId","createdAt","urlQuery");
CREATE INDEX "WebsiteEvent_websiteId_idx" ON "WebsiteEvent" USING btree ("websiteId");
CREATE INDEX "WebsiteEvent_websiteId_sessionId_createdAt_idx" ON "WebsiteEvent" USING btree ("websiteId","sessionId","createdAt");
CREATE INDEX "WebsiteEvent_websiteId_visitId_createdAt_idx" ON "WebsiteEvent" USING btree ("websiteId","visitId","createdAt");

-- Foreign keys (moved here so referenced unique/PK indexes exist first)
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "BetterAuthAccount" ADD CONSTRAINT "BetterAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "BetterAuthPasskey" ADD CONSTRAINT "BetterAuthPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "BetterAuthSession" ADD CONSTRAINT "BetterAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "APIKey" ADD CONSTRAINT "APIKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "CreditUsage" ADD CONSTRAINT "CreditUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "EventData" ADD CONSTRAINT "EventData_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."Website"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "EventData" ADD CONSTRAINT "EventData_websiteEventId_fkey" FOREIGN KEY ("websiteEventId") REFERENCES "public"."WebsiteEvent"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "ExtensionClient" ADD CONSTRAINT "ExtensionClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "ExtensionTask" ADD CONSTRAINT "ExtensionTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "ExtensionTask" ADD CONSTRAINT "ExtensionTask_targetClientId_fkey" FOREIGN KEY ("targetClientId") REFERENCES "public"."ExtensionClient"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "FileHosting" ADD CONSTRAINT "FileHosting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "ImageGeneration" ADD CONSTRAINT "ImageGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "ImageGenerationLog" ADD CONSTRAINT "ImageGenerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "ImageGenerationLog" ADD CONSTRAINT "ImageGenerationLog_imageGenerationId_fkey" FOREIGN KEY ("imageGenerationId") REFERENCES "public"."ImageGeneration"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "ImageGenerationLog" ADD CONSTRAINT "ImageGenerationLog_fileHostingId_fkey" FOREIGN KEY ("fileHostingId") REFERENCES "public"."FileHosting"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PlatformExtraConfig" ADD CONSTRAINT "PlatformExtraConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PosterGeneration" ADD CONSTRAINT "PosterGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PosterGeneration" ADD CONSTRAINT "PosterGeneration_fileHostingId_fkey" FOREIGN KEY ("fileHostingId") REFERENCES "public"."FileHosting"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PromotionCode" ADD CONSTRAINT "PromotionCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PromotionCode" ADD CONSTRAINT "PromotionCode_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."PromotionTask"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PromotionSubmission" ADD CONSTRAINT "PromotionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PromotionSubmission" ADD CONSTRAINT "PromotionSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."PromotionTask"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PromotionTask" ADD CONSTRAINT "PromotionTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PublishTask" ADD CONSTRAINT "PublishTask_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."Draft"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PublishTask" ADD CONSTRAINT "PublishTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "PublishTaskLog" ADD CONSTRAINT "PublishTaskLog_publishTaskId_fkey" FOREIGN KEY ("publishTaskId") REFERENCES "public"."PublishTask"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "PublishTaskLog" ADD CONSTRAINT "PublishTaskLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "RechargeCredit" ADD CONSTRAINT "RechargeCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "SessionData" ADD CONSTRAINT "SessionData_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "public"."Website"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "SessionData" ADD CONSTRAINT "SessionData_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."VisitorSession"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "SocialMediaAccount" ADD CONSTRAINT "SocialMediaAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "SupportConversation" ADD CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."SupportConversation"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;
ALTER TABLE "VideoTranscription" ADD CONSTRAINT "VideoTranscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;
ALTER TABLE "Website" ADD CONSTRAINT "Website_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;
ALTER TABLE "WebsiteEvent" ADD CONSTRAINT "WebsiteEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."VisitorSession"("id") ON DELETE restrict ON UPDATE cascade;
