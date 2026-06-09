import { z } from 'zod';

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookDebugTokenResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    issued_at: number;
    scopes: string[];
    granular_scopes?: { scope: string }[];
    user_id: string;
  };
}

export interface FacebookPageCategory {
  id: string;
  name: string;
}

export interface FacebookPageSummary {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  category_list?: FacebookPageCategory[];
  tasks?: string[];
  username?: string;
}

export interface FacebookPagePicture {
  data?: {
    height?: number;
    width?: number;
    url?: string;
    is_silhouette?: boolean;
  };
}

export interface FacebookPageDetails {
  id: string;
  name: string;
  username?: string;
  link?: string;
  cover?: {
    cover_id?: string;
    offset_x?: number;
    offset_y?: number;
    source?: string;
    id?: string;
  };
  description?: string;
  bio?: string;
  location?: Record<string, unknown>;
  picture?: FacebookPagePicture;
}

const FACEBOOK_API_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v23.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;
const FACEBOOK_DIALOG_BASE = `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth`;

export const FACEBOOK_CONFIG = {
  clientId: process.env.FACEBOOK_CLIENT_ID!,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
  configId: process.env.FACEBOOK_CONFIG_ID!,
  redirectUri: process.env.FACEBOOK_REDIRECT_URI!,
  scopes: [
    'read_insights',
    'pages_show_list',
    'business_management',
    'pages_read_engagement',
    'pages_manage_posts',
    'public_profile',
  ],
};

const nonEmptyStringSchema = z.string().min(1);

export function generateFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: FACEBOOK_CONFIG.clientId,
    redirect_uri: FACEBOOK_CONFIG.redirectUri,
    response_type: 'code',
    scope: FACEBOOK_CONFIG.scopes.join(','),
    state: nonEmptyStringSchema.parse(state),
    config_id: FACEBOOK_CONFIG.configId,
  });

  return `${FACEBOOK_DIALOG_BASE}?${params.toString()}`;
}

export async function exchangeCodeForFacebookUserToken(code: string): Promise<FacebookTokenResponse> {
  const params = new URLSearchParams({
    client_id: FACEBOOK_CONFIG.clientId,
    redirect_uri: FACEBOOK_CONFIG.redirectUri,
    client_secret: FACEBOOK_CONFIG.clientSecret,
    code: nonEmptyStringSchema.parse(code),
  });

  const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange Facebook code: ${response.status} ${errorText}`);
  }

  return (await response.json()) as FacebookTokenResponse;
}

export async function debugFacebookToken(userAccessToken: string): Promise<FacebookDebugTokenResponse> {
  const appAccessToken = `${FACEBOOK_CONFIG.clientId}|${FACEBOOK_CONFIG.clientSecret}`;
  const params = new URLSearchParams({
    input_token: nonEmptyStringSchema.parse(userAccessToken),
    access_token: appAccessToken,
  });

  const response = await fetch(`${GRAPH_API_BASE}/debug_token?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to debug Facebook token: ${response.status} ${errorText}`);
  }

  return (await response.json()) as FacebookDebugTokenResponse;
}

export async function getFacebookUserPages(userId: string, userAccessToken: string): Promise<FacebookPageSummary[]> {
  const params = new URLSearchParams({
    access_token: nonEmptyStringSchema.parse(userAccessToken),
    fields: ['id', 'name', 'access_token', 'category', 'category_list', 'tasks', 'username'].join(','),
  });

  const response = await fetch(`${GRAPH_API_BASE}/${nonEmptyStringSchema.parse(userId)}/accounts?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Facebook pages: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data?.data || []) as FacebookPageSummary[];
}

export async function getFacebookPageDetails(
  pageId: string,
  pageAccessToken: string,
): Promise<FacebookPageDetails> {
  const params = new URLSearchParams({
    access_token: nonEmptyStringSchema.parse(pageAccessToken),
    fields: ['id', 'name', 'username', 'location', 'link', 'cover', 'description', 'bio', 'picture'].join(','),
  });

  const response = await fetch(`${GRAPH_API_BASE}/${nonEmptyStringSchema.parse(pageId)}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Facebook page details: ${response.status} ${errorText}`);
  }

  return (await response.json()) as FacebookPageDetails;
}
