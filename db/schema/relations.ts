import { relations } from 'drizzle-orm/relations';
import {
  User,
  Session,
  BetterAuthSession,
  BetterAuthAccount,
  BetterAuthPasskey,
  Authenticator,
  Account,
} from './auth-schema.ts';
import {
  Website,
  VisitorSession,
  WebsiteEvent,
  EventData,
  SessionData,
  APIKey,
  ExtensionTask,
  ExtensionClient,
  Credit,
  CreditUsage,
  RechargeCredit,
  PromotionTask,
  PromotionCode,
  PromotionSubmission,
  PlatformExtraConfig,
  ImageGeneration,
  PosterGeneration,
  FileHosting,
  Draft,
  PublishTask,
  SocialMediaAccount,
  PublishTaskLog,
  VideoTranscription,
  ImageGenerationLog,
  SupportConversation,
  SupportMessage,
} from './schema.ts';

export const SessionRelations = relations(Session, ({ one }) => ({
  User: one(User, {
    fields: [Session.userId],
    references: [User.id],
  }),
}));

export const UserRelations = relations(User, ({ many }) => ({
  Sessions: many(Session),
  Websites: many(Website),
  APIKeys: many(APIKey),
  ExtensionTasks: many(ExtensionTask),
  Credits: many(Credit),
  CreditUsages: many(CreditUsage),
  RechargeCredits: many(RechargeCredit),
  PromotionTasks: many(PromotionTask),
  PromotionCodes: many(PromotionCode),
  PromotionSubmissions: many(PromotionSubmission),
  PlatformExtraConfigs: many(PlatformExtraConfig),
  ImageGenerations: many(ImageGeneration),
  PosterGenerations: many(PosterGeneration),
  FileHostings: many(FileHosting),
  ExtensionClients: many(ExtensionClient),
  PublishTasks: many(PublishTask),
  Drafts: many(Draft),
  SocialMediaAccounts: many(SocialMediaAccount),
  PublishTaskLogs: many(PublishTaskLog),
  VideoTranscriptions: many(VideoTranscription),
  ImageGenerationLogs: many(ImageGenerationLog),
  SupportConversations: many(SupportConversation),
  SupportMessages: many(SupportMessage),
  BetterAuthSessions: many(BetterAuthSession),
  BetterAuthAccounts: many(BetterAuthAccount),
  BetterAuthPasskeys: many(BetterAuthPasskey),
  Authenticators: many(Authenticator),
  Accounts: many(Account),
}));

export const WebsiteRelations = relations(Website, ({ one, many }) => ({
  User: one(User, {
    fields: [Website.userId],
    references: [User.id],
  }),
  EventData: many(EventData),
  SessionData: many(SessionData),
}));

export const WebsiteEventRelations = relations(WebsiteEvent, ({ one, many }) => ({
  VisitorSession: one(VisitorSession, {
    fields: [WebsiteEvent.sessionId],
    references: [VisitorSession.id],
  }),
  EventData: many(EventData),
}));

export const VisitorSessionRelations = relations(VisitorSession, ({ many }) => ({
  WebsiteEvents: many(WebsiteEvent),
  SessionData: many(SessionData),
}));

export const EventDataRelations = relations(EventData, ({ one }) => ({
  Website: one(Website, {
    fields: [EventData.websiteId],
    references: [Website.id],
  }),
  WebsiteEvent: one(WebsiteEvent, {
    fields: [EventData.websiteEventId],
    references: [WebsiteEvent.id],
  }),
}));

export const SessionDataRelations = relations(SessionData, ({ one }) => ({
  Website: one(Website, {
    fields: [SessionData.websiteId],
    references: [Website.id],
  }),
  VisitorSession: one(VisitorSession, {
    fields: [SessionData.sessionId],
    references: [VisitorSession.id],
  }),
}));

export const APIKeyRelations = relations(APIKey, ({ one }) => ({
  User: one(User, {
    fields: [APIKey.userId],
    references: [User.id],
  }),
}));

export const ExtensionTaskRelations = relations(ExtensionTask, ({ one }) => ({
  User: one(User, {
    fields: [ExtensionTask.userId],
    references: [User.id],
  }),
  ExtensionClient: one(ExtensionClient, {
    fields: [ExtensionTask.targetClientId],
    references: [ExtensionClient.id],
  }),
}));

export const ExtensionClientRelations = relations(ExtensionClient, ({ one, many }) => ({
  ExtensionTasks: many(ExtensionTask),
  User: one(User, {
    fields: [ExtensionClient.userId],
    references: [User.id],
  }),
}));

export const CreditRelations = relations(Credit, ({ one }) => ({
  User: one(User, {
    fields: [Credit.userId],
    references: [User.id],
  }),
}));

export const CreditUsageRelations = relations(CreditUsage, ({ one }) => ({
  User: one(User, {
    fields: [CreditUsage.userId],
    references: [User.id],
  }),
}));

export const RechargeCreditRelations = relations(RechargeCredit, ({ one }) => ({
  User: one(User, {
    fields: [RechargeCredit.userId],
    references: [User.id],
  }),
}));

export const PromotionTaskRelations = relations(PromotionTask, ({ one, many }) => ({
  User: one(User, {
    fields: [PromotionTask.userId],
    references: [User.id],
  }),
  PromotionCodes: many(PromotionCode),
  PromotionSubmissions: many(PromotionSubmission),
}));

export const PromotionCodeRelations = relations(PromotionCode, ({ one }) => ({
  User: one(User, {
    fields: [PromotionCode.userId],
    references: [User.id],
  }),
  PromotionTask: one(PromotionTask, {
    fields: [PromotionCode.taskId],
    references: [PromotionTask.id],
  }),
}));

export const PromotionSubmissionRelations = relations(PromotionSubmission, ({ one }) => ({
  User: one(User, {
    fields: [PromotionSubmission.userId],
    references: [User.id],
  }),
  PromotionTask: one(PromotionTask, {
    fields: [PromotionSubmission.taskId],
    references: [PromotionTask.id],
  }),
}));

export const PlatformExtraConfigRelations = relations(PlatformExtraConfig, ({ one }) => ({
  User: one(User, {
    fields: [PlatformExtraConfig.userId],
    references: [User.id],
  }),
}));

export const ImageGenerationRelations = relations(ImageGeneration, ({ one, many }) => ({
  User: one(User, {
    fields: [ImageGeneration.userId],
    references: [User.id],
  }),
  ImageGenerationLogs: many(ImageGenerationLog),
}));

export const PosterGenerationRelations = relations(PosterGeneration, ({ one }) => ({
  User: one(User, {
    fields: [PosterGeneration.userId],
    references: [User.id],
  }),
  FileHosting: one(FileHosting, {
    fields: [PosterGeneration.fileHostingId],
    references: [FileHosting.id],
  }),
}));

export const FileHostingRelations = relations(FileHosting, ({ one, many }) => ({
  PosterGenerations: many(PosterGeneration),
  User: one(User, {
    fields: [FileHosting.userId],
    references: [User.id],
  }),
  ImageGenerationLogs: many(ImageGenerationLog),
}));

export const PublishTaskRelations = relations(PublishTask, ({ one, many }) => ({
  Draft: one(Draft, {
    fields: [PublishTask.draftId],
    references: [Draft.id],
  }),
  User: one(User, {
    fields: [PublishTask.userId],
    references: [User.id],
  }),
  PublishTaskLogs: many(PublishTaskLog),
}));

export const DraftRelations = relations(Draft, ({ one, many }) => ({
  PublishTasks: many(PublishTask),
  User: one(User, {
    fields: [Draft.userId],
    references: [User.id],
  }),
}));

export const SocialMediaAccountRelations = relations(SocialMediaAccount, ({ one }) => ({
  User: one(User, {
    fields: [SocialMediaAccount.userId],
    references: [User.id],
  }),
}));

export const PublishTaskLogRelations = relations(PublishTaskLog, ({ one }) => ({
  PublishTask: one(PublishTask, {
    fields: [PublishTaskLog.publishTaskId],
    references: [PublishTask.id],
  }),
  User: one(User, {
    fields: [PublishTaskLog.userId],
    references: [User.id],
  }),
}));

export const VideoTranscriptionRelations = relations(VideoTranscription, ({ one }) => ({
  User: one(User, {
    fields: [VideoTranscription.userId],
    references: [User.id],
  }),
}));

export const ImageGenerationLogRelations = relations(ImageGenerationLog, ({ one }) => ({
  User: one(User, {
    fields: [ImageGenerationLog.userId],
    references: [User.id],
  }),
  ImageGeneration: one(ImageGeneration, {
    fields: [ImageGenerationLog.imageGenerationId],
    references: [ImageGeneration.id],
  }),
  FileHosting: one(FileHosting, {
    fields: [ImageGenerationLog.fileHostingId],
    references: [FileHosting.id],
  }),
}));

export const SupportConversationRelations = relations(SupportConversation, ({ one, many }) => ({
  User: one(User, {
    fields: [SupportConversation.userId],
    references: [User.id],
  }),
  SupportMessages: many(SupportMessage),
}));

export const SupportMessageRelations = relations(SupportMessage, ({ one }) => ({
  SupportConversation: one(SupportConversation, {
    fields: [SupportMessage.conversationId],
    references: [SupportConversation.id],
  }),
  User: one(User, {
    fields: [SupportMessage.senderUserId],
    references: [User.id],
  }),
}));

export const BetterAuthSessionRelations = relations(BetterAuthSession, ({ one }) => ({
  User: one(User, {
    fields: [BetterAuthSession.userId],
    references: [User.id],
  }),
}));

export const BetterAuthAccountRelations = relations(BetterAuthAccount, ({ one }) => ({
  User: one(User, {
    fields: [BetterAuthAccount.userId],
    references: [User.id],
  }),
}));

export const BetterAuthPasskeyRelations = relations(BetterAuthPasskey, ({ one }) => ({
  User: one(User, {
    fields: [BetterAuthPasskey.userId],
    references: [User.id],
  }),
}));

export const AuthenticatorRelations = relations(Authenticator, ({ one }) => ({
  User: one(User, {
    fields: [Authenticator.userId],
    references: [User.id],
  }),
}));

export const AccountRelations = relations(Account, ({ one }) => ({
  User: one(User, {
    fields: [Account.userId],
    references: [User.id],
  }),
}));
