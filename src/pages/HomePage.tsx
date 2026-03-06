import { TrendingUp, Activity, CheckSquare, Clock } from "lucide-react";
import { useTopics, useAllRecentUpdates } from "../lib/queries";
import { useUIStore } from "../store/ui";
import type { UpdateWithTopic } from "../types";

export default function HomePage() {
  const { data: topics = [] } = useTopics();
  const { data: recentUpdates = [] } = useAllRecentUpdates();
  const { setPage } = useUIStore();

  const activeTopics = topics.filter((t) => t.status === "active");
  const significantUpdates = recentUpdates.filter((u) => !u.noChange);
  const changesCount = significantUpdates.length;

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Overview
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 14 }}>
          Monitor your news topics and stay informed
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={<Activity size={20} />}
          label="Active Topics"
          value={activeTopics.length}
          color="var(--accent)"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Updates Today"
          value={changesCount}
          color="var(--success)"
        />
        <StatCard
          icon={<CheckSquare size={20} />}
          label="Alerts Triggered"
          value={0}
          color="var(--warning)"
        />
      </div>

      {/* Recent updates feed */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>
          Recent Updates
        </h2>

        {significantUpdates.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {significantUpdates.map((update) => (
              <UpdateCard
                key={update.id}
                update={update}
                onClick={() => setPage("topic", update.topicId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div style={{ color, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function UpdateCard({ update, onClick }: { update: UpdateWithTopic; onClick: () => void }) {
  const date = new Date(update.createdAt);
  const timeAgo = formatTimeAgo(date);

  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 20px",
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-focus)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span>{update.topicEmoji}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
          {update.topicName}
        </span>
        {update.noChange && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              background: "var(--bg-hover)",
              borderRadius: 999,
              color: "var(--text-muted)",
              marginLeft: "auto",
            }}
          >
            No change
          </span>
        )}
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginLeft: update.noChange ? 0 : "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Clock size={11} />
          {timeAgo}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {update.content}
      </p>
    </button>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: "48px 32px",
        textAlign: "center",
        background: "var(--bg-card)",
        border: "1px dashed var(--border)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔭</div>
      <h3 style={{ color: "var(--text-primary)", fontWeight: 600, margin: "0 0 8px" }}>
        No updates yet
      </h3>
      <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 13 }}>
        Create a topic and trigger a fetch to see updates here.
      </p>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
