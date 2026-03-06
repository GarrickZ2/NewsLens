import { invoke } from "@tauri-apps/api/core";
import type {
  Topic,
  ChecklistItem,
  FocusPoint,
  Update,
  UpdateWithTopic,
  Settings,
  SchedulerStatus,
  CreateTopicInput,
  PartialSettings,
  NewsEvent,
  FetchRunLog,
  GlobalStats,
} from "../types";

// Topics
export const getTopic = (id: string) => invoke<Topic>("get_topic", { id });
export const getTopics = () => invoke<Topic[]>("get_topics");
export const createTopic = (input: CreateTopicInput) => invoke<Topic>("create_topic", { input });
export const archiveTopic = (id: string) => invoke<Topic>("archive_topic", { id });
export const recoverTopic = (id: string) => invoke<Topic>("recover_topic", { id });
export const deleteTopic = (id: string) => invoke<void>("delete_topic", { id });
// Checklist
export const getChecklistItems = (topicId: string) =>
  invoke<ChecklistItem[]>("get_checklist_items", { topicId });
export const addChecklistItem = (topicId: string, text: string) =>
  invoke<ChecklistItem>("add_checklist_item", { topicId, text });
export const deleteChecklistItem = (id: string) =>
  invoke<void>("delete_checklist_item", { id });

// Focus Points
export const getFocusPoints = (topicId: string) =>
  invoke<FocusPoint[]>("get_focus_points", { topicId });
export const addFocusPoint = (topicId: string, text: string, source?: string) =>
  invoke<FocusPoint>("add_focus_point", { topicId, text, source });
export const deleteFocusPoint = (id: string) => invoke<void>("delete_focus_point", { id });

// Updates
export const getUpdates = (topicId: string, limit?: number) =>
  invoke<Update[]>("get_updates", { topicId, limit });
export const getAllRecentUpdates = (limit?: number) =>
  invoke<UpdateWithTopic[]>("get_all_recent_updates", { limit });

// Scheduler
export const triggerFetch = (topicId: string) => invoke<void>("trigger_fetch", { topicId });
export const getSchedulerStatus = () =>
  invoke<Record<string, SchedulerStatus>>("get_scheduler_status");

// Settings
export const getSettings = () => invoke<Settings>("get_settings_cmd");
export const updateSettings = (input: PartialSettings) =>
  invoke<Settings>("update_settings_cmd", { input });

// News Events
export const getNewsEvents = (topicId: string) =>
  invoke<NewsEvent[]>("get_news_events_cmd", { topicId });

// Statistics
export const getTopicRunLogs = (topicId: string, limit?: number) =>
  invoke<FetchRunLog[]>("get_topic_run_logs_cmd", { topicId, limit });
export const getGlobalStats = (startDate?: string, endDate?: string) =>
  invoke<GlobalStats>("get_global_stats_cmd", {
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });
