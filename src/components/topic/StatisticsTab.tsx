import { useTopicRunLogs } from "../../lib/queries";
import type { FetchRunLog } from "../../types";
import { Loader2 } from "lucide-react";

function formatCost(usd: number): string {
  if (usd <= 0) return "—";
  if (usd < 0.0001) return "<$0.0001";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function fmtTokens(n: number): string {
  if (n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function StatisticsTab({ topicId }: { topicId: string }) {
  const { data: logs = [], isLoading } = useTopicRunLogs(topicId);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <Loader2 size={20} style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "16px 0" }}>
        No runs recorded yet. Use "Fetch Now" to collect data.
      </div>
    );
  }

  // Aggregates
  const totalRuns = logs.length;
  const totalCost = logs.reduce((s, l) => s + l.costUsd, 0);
  const totalEvents = logs.reduce((s, l) => s + l.eventsCount, 0);
  const totalInputTokens = logs.reduce((s, l) => s + l.inputTokens, 0);
  const totalOutputTokens = logs.reduce((s, l) => s + l.outputTokens, 0);
  const totalDurationMs = logs.reduce((s, l) => s + l.durationMs, 0);
  const runsWithChange = logs.filter((l) => !l.noChange).length;

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        <SummaryCard label="Total Runs" value={String(totalRuns)} />
        <SummaryCard label="Total Cost" value={formatCost(totalCost)} />
        <SummaryCard label="Total Events" value={String(totalEvents)} />
        <SummaryCard label="Avg Duration" value={formatDuration(totalRuns > 0 ? totalDurationMs / totalRuns : 0)} />
      </div>

      {/* Token totals */}
      {totalInputTokens > 0 && (
        <div
          style={{
            display: "flex",
            gap: 24,
            padding: "10px 14px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <span>
            <span style={{ color: "var(--text-muted)" }}>Input tokens: </span>
            <strong style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>{fmtTokens(totalInputTokens)}</strong>
          </span>
          <span>
            <span style={{ color: "var(--text-muted)" }}>Output tokens: </span>
            <strong style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>{fmtTokens(totalOutputTokens)}</strong>
          </span>
          <span>
            <span style={{ color: "var(--text-muted)" }}>Runs with updates: </span>
            <strong style={{ color: "var(--text-primary)" }}>{runsWithChange} / {totalRuns}</strong>
          </span>
        </div>
      )}

      {/* Runs table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Time", "Mode", "Model", "Tokens I/O", "Cost", "Duration", "Events"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <RunLogRow key={log.id} log={log} />
            ))}
          </tbody>
        </table>
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
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function RunLogRow({ log }: { log: FetchRunLog }) {
  const isAgent = log.aiMode === "agent";
  const hasTokens = log.inputTokens > 0 || log.outputTokens > 0;

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ padding: "8px 10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
        {formatDate(log.createdAt)}
      </td>
      <td style={{ padding: "8px 10px" }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            background: isAgent ? "rgba(16,185,129,0.12)" : "rgba(99,102,241,0.12)",
            color: isAgent ? "#34d399" : "var(--accent-light)",
          }}
        >
          {log.aiMode}
        </span>
      </td>
      <td style={{ padding: "8px 10px", color: "var(--text-secondary)", fontSize: 11 }}>
        {log.modelName ? log.modelName.replace("claude-", "").replace("-latest", "") : "—"}
      </td>
      <td style={{ padding: "8px 10px", color: "var(--text-secondary)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
        {hasTokens ? `${fmtTokens(log.inputTokens)} / ${fmtTokens(log.outputTokens)}` : "— / —"}
      </td>
      <td style={{ padding: "8px 10px", color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap" }}>
        {formatCost(log.costUsd)}
      </td>
      <td style={{ padding: "8px 10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
        {formatDuration(log.durationMs)}
      </td>
      <td style={{ padding: "8px 10px" }}>
        {log.noChange ? (
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>no change</span>
        ) : (
          <span style={{ color: "#34d399", fontWeight: 600 }}>
            {log.eventsCount} new
          </span>
        )}
      </td>
    </tr>
  );
}
