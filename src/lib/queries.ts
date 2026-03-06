import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./tauri";
import type { CreateTopicInput, PartialSettings } from "../types";


// Query keys
export const qk = {
  topics: ["topics"] as const,
  topic: (id: string) => ["topic", id] as const,
  checklist: (topicId: string) => ["checklist", topicId] as const,
  focusPoints: (topicId: string) => ["focusPoints", topicId] as const,
  updates: (topicId: string) => ["updates", topicId] as const,
  allRecentUpdates: ["allRecentUpdates"] as const,
  settings: ["settings"] as const,
  schedulerStatus: ["schedulerStatus"] as const,
  newsEvents: (topicId: string) => ["newsEvents", topicId] as const,
  runLogs: (topicId: string) => ["runLogs", topicId] as const,
  globalStats: (startDate?: string, endDate?: string) => ["globalStats", startDate, endDate] as const,
};

// Hooks
export function useTopics() {
  return useQuery({ queryKey: qk.topics, queryFn: api.getTopics });
}

export function useTopic(id: string | null) {
  return useQuery({
    queryKey: qk.topic(id!),
    queryFn: () => api.getTopic(id!),
    enabled: !!id,
  });
}

export function useChecklistItems(topicId: string | null) {
  return useQuery({
    queryKey: qk.checklist(topicId!),
    queryFn: () => api.getChecklistItems(topicId!),
    enabled: !!topicId,
  });
}

export function useFocusPoints(topicId: string | null) {
  return useQuery({
    queryKey: qk.focusPoints(topicId!),
    queryFn: () => api.getFocusPoints(topicId!),
    enabled: !!topicId,
  });
}

export function useUpdates(topicId: string | null) {
  return useQuery({
    queryKey: qk.updates(topicId!),
    queryFn: () => api.getUpdates(topicId!),
    enabled: !!topicId,
  });
}

export function useAllRecentUpdates() {
  return useQuery({
    queryKey: qk.allRecentUpdates,
    queryFn: () => api.getAllRecentUpdates(20),
  });
}

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: api.getSettings });
}

export function useSchedulerStatus() {
  return useQuery({
    queryKey: qk.schedulerStatus,
    queryFn: api.getSchedulerStatus,
    refetchInterval: 30000,
  });
}

// Mutations
export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTopicInput) => api.createTopic(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.topics }),
  });
}

export function useArchiveTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveTopic(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.topics }),
  });
}

export function useRecoverTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.recoverTopic(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.topics }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTopic(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.topics }),
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, text }: { topicId: string; text: string }) =>
      api.addChecklistItem(topicId, text),
    onSuccess: (_, { topicId }) =>
      qc.invalidateQueries({ queryKey: qk.checklist(topicId) }),
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; topicId: string }) =>
      api.deleteChecklistItem(id),
    onSuccess: (_, { topicId }) =>
      qc.invalidateQueries({ queryKey: qk.checklist(topicId) }),
  });
}

export function useAddFocusPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, text, source }: { topicId: string; text: string; source?: string }) =>
      api.addFocusPoint(topicId, text, source),
    onSuccess: (_, { topicId }) =>
      qc.invalidateQueries({ queryKey: qk.focusPoints(topicId) }),
  });
}

export function useDeleteFocusPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; topicId: string }) =>
      api.deleteFocusPoint(id),
    onSuccess: (_, { topicId }) =>
      qc.invalidateQueries({ queryKey: qk.focusPoints(topicId) }),
  });
}

export function useNewsEvents(topicId: string | null) {
  return useQuery({
    queryKey: qk.newsEvents(topicId!),
    queryFn: () => api.getNewsEvents(topicId!),
    enabled: !!topicId,
  });
}

export function useTopicRunLogs(topicId: string | null) {
  return useQuery({
    queryKey: qk.runLogs(topicId!),
    queryFn: () => api.getTopicRunLogs(topicId!, 50),
    enabled: !!topicId,
  });
}

export function useGlobalStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: qk.globalStats(startDate, endDate),
    queryFn: () => api.getGlobalStats(startDate, endDate),
  });
}

export function useTriggerFetch() {
  return useMutation({
    mutationFn: (topicId: string) => api.triggerFetch(topicId),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PartialSettings) => api.updateSettings(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}
