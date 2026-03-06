export interface Topic {
  id: string;
  name: string;
  emoji: string;
  description: string;
  status: "active" | "archived";
  cronSchedule: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  archiveSummary?: string;
  summary?: string;
  summaryUpdatedAt?: string;
}

export interface NewsEvent {
  id: string;
  topicId: string;
  title: string;
  eventType: "new" | "escalation" | "resolution";
  status: "active" | "resolved";
  summary: string;
  sources: Source[];
  parentEventId?: string;
  firstSeenAt: string;
  lastUpdatedAt: string;
  occurredAt?: string;   // Real-world time the event actually occurred (from sources)
}

export interface ChecklistItem {
  id: string;
  topicId: string;
  text: string;
  triggered: boolean;
  triggeredAt?: string;
  summary?: string;
  impact?: string;
  sortOrder: number;
}

export interface FocusPoint {
  id: string;
  topicId: string;
  text: string;
  source: "manual" | "ai";
  createdAt: string;
}

export interface Source {
  name: string;
  url: string;
}

export interface Update {
  id: string;
  topicId: string;
  content: string;
  noChange: boolean;
  sources: Source[];
  createdAt: string;
}

export interface UpdateWithTopic extends Update {
  topicName: string;
  topicEmoji: string;
}


export interface Settings {
  defaultFrequency: string;
  notificationsEnabled: boolean;
  dbVersion: string;
  agentCommand: string;
  agentModel: string;
  braveApiKey: string;
  newsSources: string;      // comma-separated, empty = all
  language: string;         // output language
  discordWebhooks: string;  // JSON array of webhook URLs
}

export interface SchedulerStatus {
  topicId: string;
  isRunning: boolean;
  nextRun?: string;
  lastRun?: string;
}


export interface FetchRunLog {
  id: string;
  topicId: string;
  aiMode: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  noChange: boolean;
  eventsCount: number;
  costUsd: number;
  createdAt: string;
}

export interface TopicRunStats {
  topicId: string;
  topicName: string;
  topicEmoji: string;
  topicStatus: "active" | "archived";
  trackingSince: string;
  totalRuns: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalDurationMs: number;
  runsWithEvents: number;
  eventCount: number;
  totalCostUsd: number;
}

export interface GlobalStats {
  topics: TopicRunStats[];
}

export interface CreateTopicInput {
  name: string;
  emoji?: string;
  description: string;
  cronSchedule?: string;
}


export interface PartialSettings {
  defaultFrequency?: string;
  notificationsEnabled?: boolean;
  agentCommand?: string;
  agentModel?: string;
  braveApiKey?: string;
  newsSources?: string;
  language?: string;
  discordWebhooks?: string;
}
