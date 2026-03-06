import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useChecklistItems, useAddChecklistItem, useDeleteChecklistItem } from "../../lib/queries";

export default function ChecklistPanel({ topicId }: { topicId: string }) {
  const { data: items = [] } = useChecklistItems(topicId);
  const addItem = useAddChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addItem.mutateAsync({ topicId, text: newText.trim() });
    setNewText("");
    setAdding(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Alert Checklist
        </h3>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              background: item.triggered ? "var(--success-dim)" : "var(--bg-card)",
              border: `1px solid ${item.triggered ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
              borderRadius: 8,
            }}
          >
            {item.triggered ? (
              <CheckCircle2 size={16} style={{ color: "var(--success)", marginTop: 2, flexShrink: 0 }} />
            ) : (
              <Circle size={16} style={{ color: "var(--text-muted)", marginTop: 2, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>
                {item.text}
              </div>
              {item.triggered && item.summary && (
                <div style={{ fontSize: 12, color: "var(--success)", marginTop: 4 }}>
                  {item.summary}
                </div>
              )}
            </div>
            <button
              onClick={() => deleteItem.mutate({ id: item.id, topicId })}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 2,
                opacity: 0,
                flexShrink: 0,
              }}
              className="delete-btn"
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0")}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {adding && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewText(""); }
              }}
              placeholder="Condition to watch for..."
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-focus)",
                borderRadius: 8,
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={addItem.isPending}
              style={{
                padding: "8px 14px",
                background: "var(--accent)",
                border: "none",
                borderRadius: 8,
                color: "white",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Add
            </button>
          </div>
        )}

        {items.length === 0 && !adding && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              border: "1px dashed var(--border)",
              borderRadius: 8,
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No checklist items yet. Add conditions to monitor.
          </div>
        )}
      </div>
    </div>
  );
}
