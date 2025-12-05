import type { PlatformInfo, SyncData } from "~sync/common";
import ArticleWordpress from "./Modals/ArticleWordpress";
import DynamicOkjike from "./Modals/DynamicOkjike";
import DynamicWebhook from "./Modals/DynamicWebhook";
import DynamicZsxq from "./Modals/DynamicZSXQ";

interface ExtraInfoConfigProps {
  platformInfo: PlatformInfo;
  syncData?: SyncData;
}

export default function ExtraInfoConfig({ platformInfo }: ExtraInfoConfigProps) {
  if (platformInfo.name === "DYNAMIC_WEBHOOK") {
    return <DynamicWebhook platformKey={platformInfo.name} />;
  }
  if (platformInfo.name === "DYNAMIC_OKJIKE") {
    return <DynamicOkjike platformKey={platformInfo.name} />;
  }
  if (platformInfo.name === "DYNAMIC_ZSXQ") {
    return <DynamicZsxq platformKey={platformInfo.name} />;
  }
  if (platformInfo.name === "ARTICLE_WORDPRESS") {
    return <ArticleWordpress platformKey={platformInfo.name} />;
  }
  return null;
}
