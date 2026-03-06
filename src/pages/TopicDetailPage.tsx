import { useState, useEffect } from "react";
import { RefreshCw, Archive, Loader2, AlertCircle, Clock } from "lucide-react";
import { useTopic, useArchiveTopic, useTriggerFetch, useSchedulerStatus } from "../lib/queries";
import { useUIStore } from "../store/ui";
import ChecklistPanel from "../components/topic/ChecklistPanel";
import FocusPointsPanel from "../components/topic/FocusPointsPanel";
import UpdatesTimeline from "../components/topic/UpdatesTimeline";
import StatisticsTab from "../components/topic/StatisticsTab";
import MarketTab from "../components/topic/MarketTab";

type Tab = "updates" | "checklist" | "focus" | "stats" | "markets";

const TAB_LABELS: Record<Tab, string> = {
  updates: "Updates",
  checklist: "Checklist",
  focus: "Focus Points",
  stats: "Statistics",
  markets: "Markets",
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export default function TopicDetailPage({ topicId }: { topicId: string }) {
  const { data: topic, isLoading } = useTopic(topicId);
  const archiveTopic = useArchiveTopic();
  const triggerFetch = useTriggerFetch();
  const { setPage, fetchingTopics } = useUIStore();
  const [tab, setTab] = useState<Tab>("updates");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const { data: schedulerStatus } = useSchedulerStatus();

  const fetching = fetchingTopics.has(topicId);

  const nextRunIso = schedulerStatus?.[topicId]?.nextRun ?? undefined;
  const lastRunIso = schedulerStatus?.[topicId]?.lastRun ?? undefined;

  const [nextFetchLabel, setNextFetchLabel] = useState("");
  const [lastFetchLabel, setLastFetchLabel] = useState("");

  useEffect(() => {
    if (!nextRunIso) { setNextFetchLabel(""); return; }
    const update = () => {
      const diff = new Date(nextRunIso).getTime() - Date.now();
      if (diff <= 0) { setNextFetchLabel("Soon"); return; }
      const mins = Math.floor(diff / 60_000);
      const hrs  = Math.floor(mins / 60);
      if (hrs > 0) setNextFetchLabel(`${hrs}h ${mins % 60}m`);
      else if (mins > 0) setNextFetchLabel(`${mins}m`);
      else setNextFetchLabel(`${Math.ceil(diff / 1000)}s`);
    };
    update();
    const timer = setInterval(update, 10_000);
    return () => clearInterval(timer);
  }, [nextRunIso]);

  useEffect(() => {
    if (!lastRunIso) { setLastFetchLabel(""); return; }
    const update = () => setLastFetchLabel(formatRelativeTime(lastRunIso));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [lastRunIso]);

  if (isLoading || !topic) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
        <Loader2 size={24} style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const handleFetch = async () => {
    setFetchError(null);
    try {
      await triggerFetch.mutateAsync(topicId);
    } catch (e) {
      setFetchError(String(e));
    }
  };

  const handleArchive = async () => {
    setArchiveConfirm(false);
    try {
      await archiveTopic.mutateAsync(topicId);
      setPage("archive");
    } catch (e) {
      setFetchError(`Archive failed: ${String(e)}`);
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, flexShrink: 0,
          }}
        >
          {topic.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
            {topic.name}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {topic.description}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
            {lastFetchLabel && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Clock size={11} style={{ color: "var(--text-muted)" }} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Last fetch</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                  {lastFetchLabel}
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={11} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Next fetch in</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: nextFetchLabel ? "var(--accent)" : "var(--text-muted)", fontFamily: "monospace" }}>
                {nextFetchLabel || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleFetch}
            disabled={fetching}
            title="Fetch now"
            style={{
              padding: "8px 14px", background: "var(--accent)", border: "none",
              borderRadius: 8, color: "white", cursor: fetching ? "not-allowed" : "pointer",
              fontSize: 13, display: "flex", alignItems: "center", gap: 6,
              opacity: fetching ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: fetching ? "spin 1s linear infinite" : "none" }} />
            {fetching ? "Fetching..." : "Fetch Now"}
          </button>

          <button
            onClick={() => setArchiveConfirm(true)}
            title="Archive topic"
            style={{
              padding: "8px 12px", background: "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: 8,
              color: "var(--text-secondary)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            }}
          >
            <Archive size={14} />
            Archive
          </button>
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 16px", background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
            marginBottom: 16, fontSize: 13, color: "var(--danger)",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Fetch failed</div>
            <div style={{ opacity: 0.85, wordBreak: "break-all" }}>{fetchError}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 24, gap: 4 }}>
        {(["updates", "checklist", "focus", "stats", "markets"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px", background: "none", border: "none",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 13,
              fontWeight: tab === t ? 600 : 400, marginBottom: -1,
            }}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "updates" && <UpdatesTimeline topicId={topicId} topic={topic} />}
      {tab === "checklist" && <ChecklistPanel topicId={topicId} />}
      {tab === "focus" && <FocusPointsPanel topicId={topicId} />}
      {tab === "stats" && <StatisticsTab topicId={topicId} />}
      {tab === "markets" && <MarketTab topicId={topicId} />}

      {/* Archive confirm modal */}
      {archiveConfirm && (
        <div
          onClick={() => setArchiveConfirm(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "28px 28px 24px", width: 360, maxWidth: "90vw",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Archive this topic?
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              "{topic.name}" will be moved to the archive. You can recover it later.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setArchiveConfirm(false)}
                style={{
                  flex: 1, padding: "10px", background: "var(--bg-card)",
                  border: "1px solid var(--border)", borderRadius: 8,
                  color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiveTopic.isPending}
                style={{
                  flex: 1, padding: "10px", background: "var(--warning-dim)",
                  border: "1px solid var(--warning)", borderRadius: 8,
                  color: "var(--warning)", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {archiveTopic.isPending
                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : <Archive size={14} />}
                {archiveTopic.isPending ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
