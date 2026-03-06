import { useState, useMemo } from "react";
import { useGlobalStats } from "../lib/queries";
import type { TopicRunStats } from "../types";
import { Loader2 } from "lucide-react";

type TimeFilter = "7d" | "30d" | "90d" | "all" | "custom";

function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  return `$${usd.toFixed(3)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function trackingDuration(since: string): string {
  const days = Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d";
  return `${days}d`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function StatisticsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { startDate, endDate } = useMemo(() => {
    if (timeFilter === "all") return { startDate: undefined, endDate: undefined };
    if (timeFilter === "custom") {
      return {
        startDate: customStart ? new Date(customStart).toISOString() : undefined,
        endDate: customEnd ? new Date(customEnd + "T23:59:59").toISOString() : undefined,
      };
    }
    const days = parseInt(timeFilter);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return { startDate: d.toISOString(), endDate: undefined };
  }, [timeFilter, customStart, customEnd]);

  const { data: stats, isLoading } = useGlobalStats(startDate, endDate);

  const topics = stats?.topics ?? [];
  const activeTopics = topics.filter((t) => t.topicStatus === "active");
  const archivedTopics = topics.filter((t) => t.topicStatus === "archived");

  const totalRuns = topics.reduce((s, t) => s + t.totalRuns, 0);
  const totalEvents = topics.reduce((s, t) => s + t.eventCount, 0);
  const totalCost = topics.reduce((s, t) => s + t.totalCostUsd, 0);

  const filterOptions: { key: TimeFilter; label: string }[] = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
    { key: "all", label: "All time" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header + time filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          Statistics
        </h1>
        {/* Time filter buttons */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeFilter(key)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: timeFilter === key ? "var(--accent)" : "var(--border)",
                background: timeFilter === key ? "var(--accent-dim)" : "var(--bg-card)",
                color: timeFilter === key ? "var(--accent-light)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: timeFilter === key ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range inputs */}
      {timeFilter === "custom" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>From</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          />
          <span style={{ color: "var(--text-secondary)" }}>To</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
          <Loader2 size={24} style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
            <SummaryCard label="Total Cost" value={formatCost(totalCost)} />
            <SummaryCard label="Total Runs" value={String(totalRuns)} />
            <SummaryCard label="Total Events" value={String(totalEvents)} />
            <SummaryCard label="Topics" value={String(topics.length)} />
          </div>

          {/* Active topics */}
          {activeTopics.length > 0 && (
            <Section title="In Progress" topics={activeTopics} />
          )}

          {/* Archived topics */}
          {archivedTopics.length > 0 && (
            <Section title="Archived" topics={archivedTopics} />
          )}

          {topics.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No data yet. Run a Fetch to start collecting statistics.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, topics }: { title: string; topics: TopicRunStats[] }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {topics.map((t) => (
          <TopicStatRow key={t.topicId} stat={t} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function TopicStatRow({ stat }: { stat: TopicRunStats }) {
  const cost = stat.totalCostUsd;
  const avgDuration = stat.totalRuns > 0 ? stat.totalDurationMs / stat.totalRuns : 0;
  const changeRate = stat.totalRuns > 0 ? Math.round((stat.runsWithEvents / stat.totalRuns) * 100) : 0;
  const isArchived = stat.topicStatus === "archived";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: isArchived ? 0.75 : 1,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{stat.topicEmoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {stat.topicName}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Tracking {trackingDuration(stat.trackingSince)} · {stat.totalRuns} runs · {stat.eventCount} events
          {stat.totalRuns > 0 && ` · ${changeRate}% with changes`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flexShrink: 0, textAlign: "right" }}>
        <Metric label="Cost" value={cost > 0 ? formatCost(cost) : "—"} />
        <Metric label="Avg time" value={stat.totalRuns > 0 ? formatDuration(avgDuration) : "—"} />
        <Metric
          label="Tokens I/O"
          value={stat.totalInputTokens > 0
            ? `${fmtTokens(stat.totalInputTokens)}/${fmtTokens(stat.totalOutputTokens)}`
            : "—"}
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
