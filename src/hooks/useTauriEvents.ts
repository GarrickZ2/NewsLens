import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "../lib/queries";
import { useUIStore } from "../store/ui";

interface FetchJobStarted {
  topicId: string;
}

interface FetchJobCompleted {
  topicId: string;
  updateId: string;
  noChange: boolean;
  triggeredItems: string[];
}

interface FetchJobError {
  topicId: string;
  error: string;
}

interface ChecklistTriggered {
  topicId: string;
  itemId: string;
  itemText: string;
}

export function useTauriEvents() {
  const qc = useQueryClient();
  const setTopicFetching = useUIStore((s) => s.setTopicFetching);

  useEffect(() => {
    const unlisten: Array<() => void> = [];

    listen<FetchJobStarted>("fetch-job-started", (event) => {
      setTopicFetching(event.payload.topicId, true);
    }).then((u) => unlisten.push(u));

    listen<FetchJobCompleted>("fetch-job-completed", (event) => {
      const { topicId } = event.payload;
      setTopicFetching(topicId, false);
      qc.invalidateQueries({ queryKey: qk.updates(topicId) });
      qc.invalidateQueries({ queryKey: qk.allRecentUpdates });
      qc.invalidateQueries({ queryKey: qk.newsEvents(topicId) });
      qc.invalidateQueries({ queryKey: qk.topic(topicId) });
      qc.invalidateQueries({ queryKey: qk.runLogs(topicId) });
      qc.invalidateQueries({ queryKey: ["globalStats"] });
      if (event.payload.triggeredItems.length > 0) {
        qc.invalidateQueries({ queryKey: qk.checklist(topicId) });
      }
    }).then((u) => unlisten.push(u));

    listen<FetchJobError>("fetch-job-error", (event) => {
      setTopicFetching(event.payload.topicId, false);
      console.error("Fetch job error:", event.payload.error);
    }).then((u) => unlisten.push(u));

    listen<ChecklistTriggered>("checklist-triggered", (event) => {
      const { topicId } = event.payload;
      qc.invalidateQueries({ queryKey: qk.checklist(topicId) });
    }).then((u) => unlisten.push(u));

    return () => {
      unlisten.forEach((fn) => fn());
    };
  }, [qc, setTopicFetching]);
}
