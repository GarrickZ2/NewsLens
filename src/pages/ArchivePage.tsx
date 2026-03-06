import { Trash2, RotateCcw } from "lucide-react";
import { useTopics, useDeleteTopic, useRecoverTopic } from "../lib/queries";

export default function ArchivePage() {
  const { data: topics = [] } = useTopics();
  const deleteTopic = useDeleteTopic();
  const recoverTopic = useRecoverTopic();
  const archived = topics.filter((t) => t.status === "archived");

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}" and all its data? This cannot be undone.`)) return;
    await deleteTopic.mutateAsync(id);
  };

  const handleRecover = async (id: string) => {
    await recoverTopic.mutateAsync(id);
  };

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Archive
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>
        {archived.length} archived topic{archived.length !== 1 ? "s" : ""}
      </p>

      {archived.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            border: "1px dashed var(--border)",
            borderRadius: 12,
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          No archived topics yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {archived.map((topic) => (
            <div
              key={topic.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: topic.archiveSummary ? 8 : 0 }}>
                <span style={{ fontSize: 20 }}>{topic.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                  {topic.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                  Archived {topic.archivedAt ? new Date(topic.archivedAt).toLocaleDateString() : ""}
                </span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleRecover(topic.id)}
                    disabled={recoverTopic.isPending}
                    title="Recover topic"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "5px 8px",
                      background: "none",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--text-secondary)",
                      cursor: recoverTopic.isPending ? "not-allowed" : "pointer",
                      fontSize: 12,
                      gap: 4,
                      opacity: recoverTopic.isPending ? 0.5 : 1,
                    }}
                  >
                    <RotateCcw size={13} />
                    Recover
                  </button>
                  <button
                    onClick={() => handleDelete(topic.id, topic.name)}
                    disabled={deleteTopic.isPending}
                    title="Delete permanently"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "5px 8px",
                      background: "none",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 6,
                      color: "var(--danger)",
                      cursor: deleteTopic.isPending ? "not-allowed" : "pointer",
                      fontSize: 12,
                      gap: 4,
                      opacity: deleteTopic.isPending ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
              {topic.archiveSummary && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {topic.archiveSummary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
