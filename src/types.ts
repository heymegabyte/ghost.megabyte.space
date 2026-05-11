export interface Env {
  ASSETS: Fetcher;
  RATE_LIMIT_KV?: KVNamespace;
  EMF_DB?: D1Database;
  AI?: Ai;
  HASS_SERVER: string;
  HASS_TOKEN: string;
  MOCK_SENSOR_MODE?: string;
  TEST_HELPERS_ENABLED?: string;
  EMF_SENSOR_ENTITY_ID: string;
  EF_SENSOR_ENTITY_ID?: string;
  RF_SENSOR_ENTITY_ID?: string;
  EMF_SENSOR_NAME?: string;
  EMF_SENSOR_STARTED_AT?: string;
  SITE_NAME?: string;
  SITE_URL?: string;
  CURRENT_CACHE_TTL_SECONDS?: string;
  HISTORY_CACHE_TTL_SECONDS?: string;
  ENTROPY_CACHE_TTL_SECONDS?: string;
  PUBLIC_API_RATE_LIMIT_PER_MINUTE?: string;
  ANTHROPIC_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  LISTMONK_URL?: string;
  LISTMONK_API_USER?: string;
  LISTMONK_API_TOKEN?: string;
  LISTMONK_LIST_ID?: string;
}

export interface HomeAssistantState {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface NormalizedReading {
  entityId: string;
  friendlyName: string;
  state: string;
  numericValue: number;
  unit: string | null;
  lastChanged: string;
  lastUpdated: string;
  source: "home-assistant";
  sampledAt: string;
  cache: {
    maxAgeSeconds: number;
    staleWhileRevalidateSeconds: number;
    strategy: "cloudflare-cache-api";
  };
}

export interface HistoryPoint {
  timestamp: string;
  value: number;
}

export interface HistoryWindow {
  start: string;
  end: string;
}

export interface SnapshotRecord {
  entityId: string;
  state: string;
  numericValue: number;
  unit: string | null;
  lastChanged: string;
  lastUpdated: string;
  sampledAt: string;
  source: string;
}

export interface EntropySummary {
  entropyBits: number;
  sampleCount: number;
  windowMinutes: number;
  bins: number;
  min: number;
  max: number;
  mean: number;
  updatedAt: string;
}

export interface AppVariables {
  requestId: string;
}

export interface TimelineAnnotation {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  kind: "technical" | "narrative";
}

export interface StoryMilestone {
  id: string;
  eraLabel: string;
  title: string;
  subtitle: string;
  body: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  body: string;
  category: string;
  severity?: number;
}

export interface TimelineCategory {
  label: string;
  color: string;
}

export interface TimelineData {
  title: string;
  description: string;
  categories: Record<string, TimelineCategory>;
  events: TimelineEvent[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  ipAddress?: string;
}

export interface CallTransmission {
  id: string;
  callSid: string;
  callerNumber: string;
  transcript: string;
  aiResponse: string;
  turnNumber: number;
  createdAt: string;
}
